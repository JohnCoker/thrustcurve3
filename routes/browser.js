/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const _ = require('underscore'),
      express = require('express'),
      router = express.Router(),
      units = require('../lib/units'),
      metadata = require('../lib/metadata'),
      helpers = require('../lib/helpers'),
      schema = require('../database/schema'),
      locals = require('./locals.js');

const defaults = {
  layout: 'motors',
};

const browserPage = '/motors/browser.html';

// https://bost.ocks.org/mike/shuffle/
function shuffle(array) {
  var m = array.length, t, i;

  // While there remain elements to shuffle…
  while (m) {

    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}

const categories = metadata.Categories;

const dimensions = [
  {
    label: "Category",
    prop: "category",
    matchingValues: function(summary) {
      var match = [],
          yes, no, i, j;

      for (j = 0; j < categories.length; j++) {
        yes = no = 0;
        for (i = 0; i < summary.impulseClasses.length; i++) {
          if (categories[j].regex.test(summary.impulseClasses[i]))
            yes++;
          else
            no++;
        }
        if (yes > 0 && no > 0)
          match.push({ label: categories[j].label, value: categories[j].value });
      }
      return match;
    },
    applySelection: function(all, query, v) {
      var i;

      v = v.toLowerCase();
      for (i = 0; i < categories.length; i++) {
        if (v == categories[i].label || v == categories[i].value) {
          query.impulseClass = categories[i].regex;
          return categories[i].label;
        }
      }
    }
  },
  {
    label: "Class",
    prop: "class",
    matchingValues: function(summary) {
      return _.map(summary.impulseClasses, function(c) { return { label: c, value: c }; });
    },
    applySelection: function(all, query, v) {
      query.impulseClass = v;
      return v + ' class';
    }
  },
  {
    label: "Manufacturer",
    prop: "manufacturer",
    matchingValues: function(summary) {
      return _.map(summary.manufacturers, function(m) { return { label: m.abbrev, value: m._id }; });
    },
    applySelection: function(all, query, v) {
      var m = all.manufacturers.byId(v) || all.manufacturers.byName(v);
      if (m) {
        query._manufacturer = m._id;
        return 'by ' + m.abbrev;
      }
    }
  },
  {
    label: "Type",
    prop: "type",
    matchingValues: function(summary) {
      return _.map(summary.types, function(c) { return { label: helpers.formatType(c), value: c }; });
    },
    applySelection: function(all, query, v) {
      query.type = v;
      return helpers.formatType(v);
    }
  },
  {
    label: "Diameter",
    prop: "diameter",
    matchingValues: function(summary) {
      return _.map(summary.diameters, function(d) { return { label: units.formatMMTFromMKS(d), value: d.toFixed(4) }; });
    },
    applySelection: function(all, query, v) {
      v = parseFloat(v);
      query.diameter = { $gt: v - metadata.MotorDiameterTolerance, $lt: v + metadata.MotorDiameterTolerance };
      return units.formatMMTFromMKS(v) + ' diameter';
    }
  },
  {
    label: "Burn Time",
    prop: "burnTime",
    matchingValues: function(summary) {
      return _.map(summary.burnTimes, function(b) {
        var group = metadata.burnTimeGroup(b);
        return { label: group.label, value: group.nominal };
      });
    },
    applySelection: function(all, query, v) {
      var group = metadata.burnTimeGroup(parseFloat(v));
      if (group == null)
        return false;

      query.burnTime = { $gt: group.min, $lt: group.max };
      return group.label + ' burn time';
    }
  },
  {
    label: "Propellant",
    prop: "propellant",
    matchingValues: function(summary) {
      return _.map(summary.propellants, function(p) { return { label: p.name, value: p.name }; });
    },
    applySelection: function(all, query, v) {
      query.propellantInfo = v;
      return v;
    }
  },
  {
    label: "Case",
    prop: "case",
    matchingValues: function(summary) {
      return _.map(summary.cases, function(c) { return { label: c.name, value: c.name }; });
    },
    applySelection: function(all, query, v) {
      query.caseInfo = v;
      return v;
    }
  },
];

function applyQuery(allMotors, query, prop, value) {
  var i;

  for (i = 0; i < dimensions.length; i++) {
    if (dimensions[i].prop == prop)
      return dimensions[i].applySelection(allMotors, query, value);
  }
}

/*
 * /motors/browser.html
 * Motor browser, renders with browser/intro.hbs or browser/lists.hbs template.
 */
const MaxValues = 20;

function renderLists(req, res, trail, match, motors) {
  var lists = [],
      values, base, next, i, j;

  if (trail.length > 0) {
    base = trail[trail.length - 1].link;
    next = trail[trail.length - 1].order + 1;
  } else {
    base = browserPage + '?advanced';
    next = 1;
  }

  for (i = 0; i < dimensions.length; i++) {
    values = dimensions[i].matchingValues(match);
    if (values && values.length > 1 && values.length <= MaxValues) {
      for (j = 0; j < values.length; j++)
        values[j].link = base + '&' + next + dimensions[i].prop + '=' + encodeURIComponent(values[j].value);
      lists.push({
        label: dimensions[i].label,
        prop: dimensions[i].prop,
        values: values,
      });
    }
  }
  if (lists.length > 6)
    lists.splice(6, lists.length - 6);

  if (motors && motors.length > MaxValues)
    motors = undefined;
  if (motors && motors.length > 0) {
    for (i = 0; i < motors.length; i++)
      motors[i]._manufacturer = match.manufacturers.byId(motors[i]._manufacturer);

    if (motors.length < 2)
      lists = [];
  }

  res.render('browser/lists', locals(req, defaults, {
    title: 'Motor Browser',
    trail: trail,
    lists: lists,
    motorCount: match.count,
    motors: motors
  }));
}

router.get(browserPage, function(req, res, next) {
  metadata.get(req, function(caches) {
    var params = Object.keys(req.query), advanced = false, criteria = 0,
        query, trail, param, name, order, label, mfrs, i, j;

    // parse input parameters
    if (params.length > 0) {
      query = {};
      trail = [];
      for (i = 0; i < params.length; i++) {
        // extract next parameter, with optional order
        param = name = params[i];
        order = Infinity;
        if (/^\d/.test(param)) {
          order = parseInt(param);
          name = param.replace(/^\d+/, '');
        }
        if (order <= 0)
          order = Infinity;
    
        if (param == 'advanced')
          advanced = true;
        else {
          label = applyQuery(caches.allMotors, query, name, req.query[param]);
          if (label) {
            advanced = true;
            criteria++;
            trail.push({
              prop: name,
              order: order,
              label: label,
              value: req.query[param]
            });
          }
        }
      }
    }
  
    if (advanced) {
      // head of trail (all motors)
      trail.splice(0, 0, {
        label: 'All Motors',
        order: 0,
        link: browserPage + '?advanced',
        head: true
      });

      // show matching lists to narrow down
      if (criteria > 0) {
        // organize breadcrumb trail
        if (trail.length > 1) {
          trail.sort(function(a,b) {
            if (a.order != b.order)
              return a.order - b.order;
            else
              return a.prop - b.prop;
          });
        }
        for (i = 1; i < trail.length; i++) {
          trail[i].order = i;

          trail[i].link = browserPage + '?advanced';
          for (j = 0; j <= i; j++) {
	    if (trail[j].prop)
              trail[i].link += '&' + trail[j].order + trail[j].prop + '=' + trail[j].value;
	  }
        }
        trail[trail.length - 1].current = true;

        // query motors that match selections
        query.availability = { $in: schema.MotorAvailableEnum };
        metadata.getMatchingMotors(req, query, function(match, motors) {
          renderLists(req, res, trail, match, motors);
        });
      } else {
        trail[0].current = true;

        // all available motors
        metadata.getAvailableMotors(req, function(summary) {
          renderLists(req, res, trail, summary);
        });
      }

    } else {
      // render intro page
      mfrs = [];
      for (i = 0; i < caches.manufacturers.length; i++) {
        if (caches.manufacturers[i].active)
          mfrs.push(caches.manufacturers[i]);
      }
      shuffle(mfrs);
  
      res.render('browser/intro', locals(req, defaults, {
        title: 'Motor Browser',
        motorCount: caches.availableMotors.count,
        manufacturers: mfrs,
        advancedLink: browserPage + '?advanced',
        categoryLink: browserPage + '?1category',
        classLink: browserPage + '?1class',
        typeLink: browserPage + '?1type',
        manufacturerLink: browserPage + '?1manufacturer',
      }));
    }
  });
});
router.get(['/browser.shtml', '/browser.jsp'], function(req, res, next) {
  res.redirect(301, '/motors/browser.html');
});


module.exports = router;
