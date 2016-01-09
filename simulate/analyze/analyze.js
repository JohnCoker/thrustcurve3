/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var errors = require('../../lib/errors');

var StdParams = {
  burnTimeCutoff: 0.05,  // percent
  timeEpsilon: 0.00005,  // seconds
  thrustEpsilon: 0.0005, // Newtons
};
Object.freeze(StdParams);

function normalize(input, params, error) {
  var output, lastTime, dropped, merged, i, x, y;

  // optional arguments
  if (arguments.length == 2 && typeof arguments[1] == 'function') {
    error = arguments[1];
    params = undefined;
  }
  if (params == null)
    params = StdParams;
  if (error == null)
    error = function() {};

  // copy valid data points
  output = [];
  dropped = 0;
  for (i = 0; i < input.length; i++) {
    x = input[i].time;
    y = input[i].thrust;
    if (typeof x != 'number' || isNaN(x) || x < 0 ||
        typeof y != 'number' || isNaN(y) || y < 0)
      dropped++;
    else
      output.push(input[i]);
  }
  if (dropped > 0) {
    error(errors.INVALID_POINTS, "droped {1} invalid data points", dropped);
    if (output.length < 1)
      return;
  }

  // sort by increasing time
  output.sort(function(a, b) { return a.time - b.time; });

  // discard leading zero-thrust points
  dropped = 0;
  while (output.length > 0 && output[0].thrust < params.thrustEpsilon) {
    output.splice(0, 1);
    dropped++;
  }

  // merge duplicate time points
  lastTime = 0;
  dropped = 0;
  i = 0;
  while (i < output.length) {
    if (i > 0 && output[i].time < lastTime + params.timeEpsilon) {
      // merge this point with the prior one(s)
      if (output[i - 1].count > 0) {
	// already merged two points
	merged = output[i - 1];
      } else {
	// start merging points here
	merged = {
	  time: output[i - 1].time,
	  thrust: output[i - 1].thrust,
	  count: 1,
	  sum: output[i - 1].thrust
	};
	output[i - 1] = merged;
      }
      merged.sum += output[i].thrust;
      merged.count++;
      merged.thrust = merged.sum / merged.count;

      // drop duplicate point
      output.splice(i, 1);
      dropped++;
    } else {
      // leave this point
      lastTime = output[i].time;
      i++;
    }
  }
  if (dropped > 0)
    error(errors.DUPLICATE_POINTS, "merged {1} duplicate time data points", dropped);

  if (output.length > 0)
    return output;
}

function stats(data, params, error) {
  var points, maxTime, maxThrust, burnStart, burnEnd, burnTime, totalImpulse,
      cutoff, lastPoint, nextPoint, i, x, y;

  // optional arguments
  if (arguments.length == 2 && typeof arguments[1] == 'function') {
    error = arguments[1];
    params = undefined;
  }
  if (params == null)
    params = StdParams;
  if (error == null)
    error = function() {};

  // get raw data points to analyze
  if (Array.isArray(data))
    points = data;
  else
    points = data.points;

  // normalize data points
  points = normalize(points, params, error);
  if (points == null || points.length < 1)
    return;

  // find the max thrust and time
  maxThrust = maxTime = 0;
  for (i = 0; i < points.length; i++) {
    x = points[i].time;
    y = points[i].thrust;
    if (x > maxTime)
      maxTime = x;
    if (y > maxThrust)
      maxThrust = y;
  }

  // find the standard burn time
  burnStart = 0;
  burnEnd = maxTime;
  if (params.burnTimeCutoff > 0 && points.length > 2) {
    cutoff = maxThrust * params.burnTimeCutoff;

    // find the last point below the cut-off from start
    lastPoint = undefined;
    for (i = 0; i < points.length && points[i].thrust < cutoff; i++)
      lastPoint = points[i];

    if (i < points.length) {
      if (lastPoint == null)
	lastPoint = { time: 0, thrust: 0 };
      nextPoint = points[i];

      // standard burn time end is where the thrust dropped below the cut-off
      burnStart = (nextPoint.time +
		   (nextPoint.time - lastPoint.time) *
		   (nextPoint.thrust - cutoff) / (lastPoint.thrust - nextPoint.thrust));
    }

    // find the next point below the cut-off from end
    nextPoint = undefined;
    for (i = points.length - 1; i > 1 && points[i].thrust < cutoff; i--)
      nextPoint = points[i];

    if (nextPoint && i > 0) {
      // get the last point above the cut-off
      lastPoint = points[i];

      // standard burn time end is where the thrust dropped below the cut-off
      burnEnd = (lastPoint.time +
		 (nextPoint.time - lastPoint.time) *
		 (cutoff - lastPoint.thrust) / (nextPoint.thrust - lastPoint.thrust));
    }
  }
  burnTime = burnEnd - burnStart;

  // integrate total impulse
  totalImpulse = 0;
  if (points[0].time > 0) {
    // assume average of thrust and zero (at t0)
    totalImpulse += points[0].time * points[0].thrust / 2;
  }
  for (i = 1; i < points.length; i++) {
    // assume average thrust between two time points
    totalImpulse += ((points[i].time - points[i - 1].time) *
		     (points[i].thrust + points[i - 1].thrust) / 2);
  }

  return {
    pointCount: points.length,
    params: params,
    maxThrust: maxThrust,
    maxTime: maxTime,
    avgThrust: totalImpulse / burnTime,
    burnStart: burnStart,
    burnEnd: burnEnd,
    burnTime: burnTime,
    totalImpulse: totalImpulse,
  };
}

function fit(data, params, error) {
  var points, source, i;

  // optional arguments
  if (arguments.length == 2 && typeof arguments[1] == 'function') {
    error = arguments[1];
    params = undefined;
  }
  if (params == null)
    params = StdParams;
  if (error == null)
    error = function() {};

  // get raw data points to analyze
  if (Array.isArray(data))
    points = data;
  else
    points = data.points;

  // normalize data points
  points = normalize(points, params, error);
  if (points == null || points.length < 1)
    return;

  // start source code generation
  source = 'if (time < 0) return 0;\n';

  if (points[0].time > 0) {
    // thrust between zero and first point value
    source += ('if (time < ' + points[0].time + ') return ' +
	       'time / ' + points[0].time + ' * ' + points[0].thrust + ';\n');
  }
  for (i = 1; i < points.length; i++) {
    // thrust between prior and next point values
    source += ('if (time < ' + points[i].time + ') return ' +
	       ('((' + points[i].time + ' - time) / ' +
		(points[i].time - points[i - 1].time) + ' * ' + points[i - 1].thrust + ')') +
	       ' + ' +
	       ('((time - ' + points[i - 1].time + ') / ' +
		(points[i].time - points[i - 1].time) + ' * ' + points[i].thrust + ')') +
	      ';\n');
  }
  source += 'return 0;';

  return new Function('time', source);
}

/**
 * <p>The <b>analyze</b> module produces meta-information from parsed motor data.
 * First the simulator files must be parsed using the <b>parsers</b> module, then they
 * can be examined with functions in this module.</p>
 *
 * <p>These functions all accept the output from the parsing functions in {@link module:parsers}.</p>
 *
 * <p>They also take a set of parameters used for analysis:</p>
 * <ul>
 * <li>burnTimeCutoff: the fraction of maximum thrust used as the start/end burn threshold (5%)</li>
 * <li>timeEpsilon: the smallest amount of time considered distinct when normalizing data points (50µs)</li>
 * <li>thrustEpsilon: the smallest amount of thrust considered positive when normalizing data points (500µN)</li>
 * </ul>
 *
 * <p>The final argument is an error reporter, from the {@link module:errors} module.
 * If no error reporter is provided, errors are sliently discarded.</p>
 *
 * <p>Data points are objects that have two key values: <code>time</code> and <code>thrust</code>,
 * plus other values that may be included from the original data file.
 * As always, internally values are in MKS so thrust is in Newtons.</p>
 *
 * @module analyze
 */
module.exports = {

  /**
   * <p>Default values of parameters needed for analysis.  If not specified as the
   * second argument to any of the functions in this module, these values are used:</p>
   *
   * <ul>
   * <li>burnTimeCutoff: 5% (<code>0.05</code>)</li>
   * <li>timeEpsilon: 50µs (<code>0.00005</code>)</li>
   * <li>thrustEpsilon: 500µN (<code>0.0005</code>)</li>
   * </ul>
   *
   * @member {object}
   */
  StdParams: StdParams,

  /**
   * <p>Build a more regular set of time/thrust data points from the
   * parsed file data that is more consistent and easier to process.</p>
   *
   * <p>Unless there are no valid points at all, an array of output points is returned.
   * However if the data is completely bad, undefined is returned.</p>
   *
   * <p>The transformations applied:</p>
   * <ul>
   * <li>points with invalid values are discarded</li>
   * <li>points are sorted by time</li>
   * <li>initial points with zero thrust are discarded</li>
   * <li>points with duplicate times are merged</li>
   * </ul>
   *
   * <p>Note that data point merging is dependent on the <code>timeEpsilon</code>
   * value in the analysis parameters and
   * leading-zero dropping is dependent on <code>thrustEpsilon</code>.
   * The default values are tiny (50µs and 500µN respectively).
   * </p>
   *
   * @function
   * @param {object} data a parsed data file
   * @param {object} [params] analysis parameters
   * @param {function} [error] error reporter
   * @return {object[]} normalized data points
   */
  normalize: normalize,

  /**
   * <p>Produced a set of statistics from the original thrust curve data points.
   * These allow comparision of the thrust curve with the published statistics
   * for a motor, as well as the statistics present in the data file itself.</p>
   *
   * <p>The returned object includes these statistics (MKS units):</p>
   * <ul>
   * <li>pointCount: number of (normalized) data points</li>
   * <li>params: the input analysis parameters</li>
   * <li>maxThrust: the maximum instantaneous thrust</li>
   * <li>maxTime: the maximum time of any data point</li>
   * <li>avgThrust: the total impululse over the standard burn time</li>
   * <li>burnStart: the time at which the thrust exceeds the cut-off</li>
   * <li>burnEnd: the time at which the thrust drops below the cut-off</li>
   * <li>burnTime: the standardized burn time based on the cut-off</li>
   * <li>totalImpulse: integration of the area under the thrust curve</li>
   * </ul>
   *
   * <p>Note that the burn time and average thrust are dependent on the
   * <code>burnTimeCutoff</code> value in the analysis parameters.
   * The default value is <code>0.05</code> to produce the 5% NFPA threshold.<p>
   *
   * @function
   * @param {object} data a parsed data file
   * @param {object} [params] analysis parameters
   * @param {function} [error] error reporter
   * @return {object} statistics object
   */
  stats: stats,

  /**
   * <p>Produce a function that maps arbitrary time values to thrust values that
   * match the thrust curve.  This is useful for sampling the thrust curve at
   * a high frequency, as is needed for flight simulation.</p>
   *
   * <p>The returned function takes a single argument, the time in seconds,
   * and returns the instantaneous thrust in Newtones. Time values below zero and
   * after the end of the burn return zero thrust.</p>
   *
   * <p>This function uses linear interpolation between the original data points
   * so that the simple integration of any curve produced by higher-frequency
   * sampling will closely match that produced from the original data.</p>
   *
   * @function
   * @param {object} data a parsed data file
   * @param {object} [params] analysis parameters
   * @param {function} [error] error reporter
   * @return {function} a function mapping time to thrust
   */
  fit: fit,
};

