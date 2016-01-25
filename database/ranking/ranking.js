/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

/*
 * The MotorSummary is used to group view records by motor ID.
 */
function MotorSummary(id) {
  this.id = id;
  this.totalViews = 0;
  this.latterViews = 0;
}
MotorSummary.prototype.hit = function(latter) {
  this.totalViews++;
  if (latter)
    this.latterViews++;
};

/*
 * The Population is used to collect motors that should be ranked together.
 */
function Population(label, classes) {
  this.label = label;
  this.classes = classes;
  this.motors = [];
}
Population.prototype.size = function() {
  return this.motors.length;
};
Population.prototype.offer = function(motor) {
  if (this.classes && this.classes.indexOf(motor.impulseClass) < 0)
    return;
  if (this.motors.indexOf(motor) < 0)
    this.motors.push(motor);
};
Population.prototype.finalize = function(max) {
  var sum, d, i;

  if (max == null)
    max = 10;

  // calculate average and standard deviation
  if (this.motors.length > 1) {
    sum = 0;
    for (i = 0; i < this.motors.length; i++)
      sum += this.motors[i].trendRatio;
    this.trendAvg = sum / this.motors.length;

    sum = 0;
    for (i = 0; i < this.motors.length; i++) {
      d = this.motors[i].trendRatio - this.trendAvg;
      sum += d * d;
    }
    this.trendSD = Math.sqrt(sum / this.motors.length);
  }

  // sort and truncate
  this.motors.sort(function(a, b) {
    return b.totalViews - a.totalViews;
  });
  if (this.motors.length > max)
    this.motors.length = max;

  // calculate sigma for each trend
  if (this.trendSD != null) {
    for (i = 0; i < this.motors.length; i++)
      this.motors[i].trendSigma = (this.motors[i].trendRatio - this.trendAvg) / this.trendSD;
  }
};
Population.prototype.print = function() {
  var line, m, s, i, j;

  if (this.label)
    line = '"' + this.label + '"';
  else
    line = '*overall*';
  line += ' (n ' + this.motors.length + '):';
  console.log(line);

  for (i = 0; i < this.motors.length; i++) {
    m = this.motors[i];
    line = '| ';
    for (j = 0; j < 20; j++)
      line += m.designation.length > j ? m.designation[j] : ' ';

    line += ' | ';

    s = m.totalViews.toFixed();
    for (j = 10; j > s.length; j--)
      line += ' ';
    line += s;

    line += ' | ';

    s = m.trendRatio.toFixed(3);
    for (j = 10; j > s.length; j--)
      line += ' ';
    line += s;

    if (m.trendSigma != null) {
      line += ' | ';

      s = m.trendSigma.toFixed(2) + 'σ';
      if (s[0] != '-')
        s = '+' + s;
      for (j = 10; j > s.length; j--)
        line += ' ';
      line += s;
    }

    line += ' |';
    console.log(line);
  }
};
Population.prototype.document = function() {
  var doc = {}, i;

  if (this.motors.length < 1)
    return;

  if (this.label)
    doc.label = this.label;
  if (this.classes)
    doc.classes = this.classes;

  if (this.trendAvg != null) {
    doc.trendAvg = this.trendAvg;
    doc.trendSD = this.trendSD;
  }

  doc.motors = [];
  for (i = 0; i < this.motors.length; i++) {
    doc.motors[i] = {
      _motor: this.motors[i].id,
      views: this.motors[i].totalViews,
      trendRatio: this.motors[i].trendRatio,
      trendSigma: this.motors[i].trendSigma,
    };
  }

  return doc;
};

function calculate(options, cb) {
  var maxActual, minQuery, minActual, trendFraction, trendStart, q;

  /*
   * Get the trend fraction, must be in (0..1).
   * Closer to 50% is better, otherwise there will be too little data in the latter bucket.
   */
  if (options.trendFraction > 0.01 && options.trendFraction < 0.99)
    trendFraction = options.trendFraction;
  else
    trendFraction = 0.35;

  /*
   * Get the actual maximum date.
   * A query is done with the specified query max date if any,
   * otherwise an open-ended query is done.
   * In either case, only a single record is retrieved.
   */
  q = {};
  if (options.maxDate != null)
    q.createdAt = { $le: options.maxDate };
  options.MotorView.findOne(q, undefined, { sort: { createdAt: -1 } }, function(err, result) {
    if (err) {
      cb(err, undefined);
      return;
    }
    if (result == null) {
      cb(new Error('No motor views found before end date'), undefined);
      return;
    }
    maxActual = result.createdAt;

    /*
     * Require a minimum date, defaulting to 90 days before the latest value found.
     */
    if (options.minDate != null)
      minQuery = options.minDate;
    else
      minQuery = new Date(maxActual.getTime() - (90 * 24 * 60 * 60 * 1000));

    /*
     * Get the actual minimum date within the query range.
     * A query is done with the calculated min date and query max date if any;
     * only a single record is retrieved.
     */
    if (q.createdAt)
      q = { $and: [ q, { createdAt: { $gt: minQuery } } ] };
    else
      q = { createdAt: { $gt: minQuery } };
    options.MotorView.findOne(q, undefined, { sort: { createdAt: 1 } }, function(err, result) {
      if (err) {
        cb(err, undefined);
        return;
      }
      if (result == null) {
        cb(new Error('No motor views found within date range'), undefined);
        return;
      }
      minActual = result.createdAt;

      // calculate the start date of the latter period for trend analysis
      trendStart = new Date(maxActual.getTime() - Math.round((maxActual.getTime() - minActual.getTime()) * trendFraction));

      /*
       * Summarize motor views within that range.
       * All motor view entries are fetched, using streaming to reduce memory.
       * The results are grouped by motor ID and the summaries created.
       */
      var summaryMap = {};
      var viewCount = 0;
      var latterCount = 0;
      var views = options.MotorView.find(q).stream();
      views.on('data', function(view) {
        var id = view._motor.toString(),
            summary = summaryMap[id];
        if (summary == null) {
          summary = new MotorSummary(id);
          summaryMap[id] = summary;
        }

        viewCount++;
        if (view.createdAt >= trendStart) {
          summary.hit(true);
          latterCount++;
        } else {
          summary.hit(false);
        }
      });
      views.on('error', function(err) {
        cb(err, undefined);
      });
      views.on('close', function() {
        var motorIds = Object.keys(summaryMap),
            summaryCount = motorIds.length,
            summaries = [],
            i;

        // make sure we have enough data to play with
        if (viewCount < 100 || summaryCount < 10) {
          cb(new Error('Too few views found within date range'), undefined);
          return;
        }

        // move into array and sort by views descending
        for (i = 0; i < motorIds.length; i++)
          summaries.push(summaryMap[motorIds[i]]);
        summaries.sort(function(a, b) {
          return b.totalViews - a.totalViews;
        });
        var maxViews = summaries[0].totalViews;

        /*
         * Discard views below 10% of maximum, absolute limit 250.
         * The summaries are already sorted, so we could chop off the array arbitrarily,
         * but we also discard infrequently viewed motors to reduce noise in the long tail.
         */
        const hardLimit = 250;
        if (summaries.length > hardLimit) {
          motorIds = [];
          for (i = 0; i < summaries.length; i++) {
            if (i == hardLimit || summaries[i].totalViews < maxViews / 10) {
              summaries.length = i;
              break;
            }
            motorIds.push(summaries[i].id);
          }
        }

        /*
         * Calculate trend as a fraction of expected latter views.
         * Note that we normalize by the overall latter views vs.
         * overall total views to account for a larger trend in site usage
         * due to seasonality.
         */
        var expected, min, max, sum = 0;
        for (i = 0; i < summaries.length; i++) {
          expected = summaries[i].totalViews * (latterCount / viewCount);
          summaries[i].trendRatio = (summaries[i].latterViews - expected) / expected;

          if (i === 0)
            min = max = summaries[i].trendRatio;
          else {
            if (summaries[i].trendRatio < min)
              min = summaries[i].trendRatio;
            if (summaries[i].trendRatio > max)
              max = summaries[i].trendRatio;
          }
          sum += summaries[i].trendRatio;
        }

        /*
         * Fetch motors for the remaining summaries.
         * This is done streaming as well, limiting the fields fetched to designation
         * and impulse class.
         */
        q = { _id: { $in: motorIds } };
        var motors = options.Motor.find(q, 'designation impulseClass').stream();
        motors.on('data', function(motor) {
          var id = motor._id.toString(),
              summary = summaryMap[id];
          summary.impulseClass = motor.impulseClass;
          summary.designation = motor.designation;
        });
        motors.on('error', function(err) {
          cb(err, undefined);
        });
        motors.on('close', function() {
          var badCount = 0,
              i, j;

          // discard summaries that don't correspond to motors
          for (i = 0; i < summaries.length; ) {
            if (summaries[i].impulseClass == null) {
              summaries.splice(i, 1);
              badCount++;
            } else {
              i++;
            }
          }
          summaryMap = null;

          /*
           * Build overall ranking and group rankings.
           * We bucket the motors into several populations, by impulse groups.
           */
          var overall = new Population();
          var groups = [
            new Population('model', 'ABCD'),
            new Population('MPR', 'EFG'),
            new Population('level-1', 'HI'),
            new Population('level-2', 'JKL'),
            new Population('level-3', 'MNO'),
          ];
          for (i = 0; i < summaries.length; i++) {
            overall.offer(summaries[i]);
            for (j = 0; j < groups.length; j++)
              groups[j].offer(summaries[i]);
          }
          overall.finalize(25);
          for (j = 0; j < groups.length; j++)
            groups[j].finalize(10);

          // construct the document and we're done
          var doc = {
            overall: overall.document(),
            categories: []
          };
          for (j = 0; j < groups.length; j++) {
            if (groups[j].size() > 0)
              doc.categories.push(groups[j].document());
          }
          cb(undefined, doc);
        });
      });
    });
  });
}

function build(options, cb) {
  var DateOnly = require('mongoose-dateonly')(options.mongoose),
      today = new DateOnly();

  options.MotorRanking.findOne({ asOf: today }, function(err, existing) {
    if (err) {
      cb(err, undefined);
      return;
    }
    if (existing != null && !options.force) {
      cb(undefined, existing);
      return;
    }

    calculate(options, function(err, doc) {
      var model;

      if (err || doc == null) {
        cb(err, undefined);
        return;
      }

      if (existing != null) {
        existing.overall = doc.overall;
        existing.categories = doc.categories;
        existing.save(cb);
      } else {
        doc.asOf = today;
        model = new options.MotorRanking(doc);
        options.MotorRanking.create(doc, cb);
      }
    });
  });
}

/**
 * <p>The <b>ranking</b> module has the code to calculate popularity rankings
 * for motors based on motor views.</p>
 *
 * @module ranking
 */
module.exports = {
  /**
   * <p>Calculate a set of rankings for recent motor views.
   * If the range of time is not specified, all data from the last three
   * months is used (minDate: now - 90 days, no maxDate restriction).</p>
   *
   * <p>The <code>options</code> object must contain the initialized Mongoose model for
   * querying the motorViews collection.</p>
   *
   * <p>The <code>callback</code> function is made with two arguments: error and result.
   * Result will be an object with data for construction of a MotorRanking model.
   * If there is not enough data in the range, or an error occurs,
   * the model will be undefined.</p>
   *
   * @function
   * @param {object} options options, including mongoose models
   * @param {object} options.Motor the Mongoose model for the motors collection
   * @param {object} options.MotorView the Mongoose model for the motorViews collection
   * @param {Date} [options.minDate] the minimum date to query, default 90 days ago
   * @param {Date} [options.maxDate] the maximum date to query, default end of time
   * @param {number} [options.trendFraction] the fraction to use for trends, default 0.35
   * @param {function} cb callback when calculation is complete
   */
  calculate: calculate,

  /**
   * <p>Build and save, if necessary, the rankings for today.
   * If rankings already exist, load them and don't rebuild.</p>
   *
   * <p>The <code>options</code> object must contain the initialized Mongoose model for
   * querying the motorViews collection.</p>
   *
   * <p>The <code>callback</code> function is made with two arguments: error and result.
   * Result will be a saved MotorRanking model.
   * If there is not enough data in the range, or an error occurs,
   * the model will be undefined.</p>
   *
   * @function
   * @param {object} options options, including mongoose models
   * @param {object} options.mongoose the connected Mongoose instance
   * @param {object} options.Motor the Mongoose model for the motors collection
   * @param {object} options.MotorView the Mongoose model for the motorViews collection
   * @param {object} options.MotorRanking the Mongoose model for the motorRankings collection
   * @param {Date} [options.minDate] the minimum date to query, default 90 days ago
   * @param {Date} [options.maxDate] the maximum date to query, default end of time
   * @param {number} [options.trendFraction] the fraction to use for trends, default 0.35
   * @param {boolean} options.force rebuild the rankings even if they exist
   * @param {function} cb callback when build is complete
   */
  build: build
};
