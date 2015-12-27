/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var strformat = require('strformat');

function format(code, fmt) {
  var msg, args, i;

  if (arguments.length > 2) {
    args = [];
    for (i = 1; i < arguments.length; i++)
      args.push(arguments[i]);
    msg = strformat(fmt, args);
  } else if (arguments.length > 1)
    msg = fmt;
  else if (arguments.length > 0)
    msg = 'error ' + code;
  else
    msg = 'unknown error';

  return msg;
}

// default error function for unit tests
function print(code, fmt) {
  // validate error code
  if (typeof code != 'number' || code < 100)
    throw new Error('missing error code');

  // validate error message
  if (arguments.length < 2 || typeof fmt != 'string' || fmt === '')
    throw new Error('missing error message');
  if (/{[^1-9]*}/.test(fmt))
    throw new Error('invalid message parameters: ' + fmt);
  var argCount = arguments.length - 2;
  fmt.replace(/{[1-9]}*}/g, function(match) {
    var n = parseInt(match.substring(1, 2));
    if (isNaN(n) || n < 1 || n > argCount)
      throw new Error('invalid message parameter: ' + match);
  });

  // print the error
  console.error('(error ' + code + ') ' + format.apply(null, arguments));
}

function Collector() {
  var func = function(code, fmt) {
    func.errors.push({
      code: code,
      message: format.apply(null, arguments)
    });
  };
  func.errors = [];
  func.hasErrors = function() { return func.errors.length > 0; };
  func.errorCount = function() { return func.errors.length; };
  func.lastError = function() { if (func.errors.length > 0) return func.errors[func.errors.length - 1]; };
  func.reset = function() { func.errors = []; };
  return func;
}

module.exports = {
  format: format,
  print: print,
  Collector: Collector,

  // motor data parsing
  DATA_FILE_FORMAT:  101,
  DATA_FILE_EMPTY:   102,
  RASP_INFO_LINE:    103,
  ROCKSIM_BAD_XML:   104,
  ROCKSIM_WRONG_DOC: 104,
  INVALID_INFO:      104,
  MISSING_POINTS:    105,
  INVALID_POINTS:    105,
};
