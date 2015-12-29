/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var errors = require('../../lib/errors');

var StdParams = {
  burnTimeCutoff: 0.05,
  timeEpsilon: 0.00005,
  thrustEpsilon: 0.0005,
};

function normalize(input, params, error) {
  var output, lastTime, dropped, merged, i, x, y;

  // optional arguments
  if (arguments.length == 2) {
    if (typeof arguments[1] == 'function')
      error = arguments[1];
    else
      params = arguments[1];
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

  return output;
}

function stats(data, params, error) {
  var points, maxTime, maxThrust, burnStart, burnEnd, burnTime, totalImpulse,
      cutoff, lastPoint, nextPoint, i, x, y;

  // optional arguments
  if (arguments.length == 2) {
    if (typeof arguments[1] == 'function')
      error = arguments[1];
    else
      params = arguments[1];
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
    for (i = 0; i < points.length && points[i].thrust < cutoff; i--)
      lastPoint = points[i];

    if (i < points.length) {
      if (lastPoint == null)
	lastPoint = { time: 0, thrust: 0 };
      nextPoint = points[i];

      // standard burn time end is where the thrust dropped below the cut-off
      burnStart = (lastPoint.time +
		   (nextPoint.time - lastPoint.time) *
		   (lastPoint.thrust - cutoff) / (lastPoint.thrust - nextPoint.thrust));
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
  if (arguments.length == 2) {
    if (typeof arguments[1] == 'function')
      error = arguments[1];
    else
      params = arguments[1];
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

module.exports = {
  StdParams: StdParams,
  normalize: normalize,
  stats: stats,
  fit: fit,
};

