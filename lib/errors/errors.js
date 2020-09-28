/*
 * Copyright 2015-2020 John Coker for ThrustCurve.org
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

function throw_(code, fmt) {
  // jshint validthis:true
  print.apply(this, arguments);
  throw new Error('error occurred');
}

function ignore(code, fmt) {
}
ignore.errors = [];
ignore.hasErrors = function() { return false; };
ignore.errorCount = function() { return 0; };
ignore.lastError = function() { };
Object.freeze(ignore.errors);
Object.freeze(ignore);

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

/**
 * <p>The errors module contains methods for formatting and reporting errors.
 * This centralizes error string processing, allowing localization at some later time.
 * In addition to error messages, error have defined codes, which allow programmatic
 * processing of exceptional conditions.</p>
 *
 * <p>Generally low-level functions take as their last argument an error processor,
 * usually named "error".  An error processor exposes a single function that takes
 * two or more arguments:</p>
 * <ul>
 * <li>code: the error code (from this module)</li>
 * <li>format: the error message</li>
 * <li>args: arguments that are applied to the format</li>
 * </ul>
 *
 * <p>The format uses curly-delimited indexes to match the position in the format
 * to the ordinal value of the arguments passed after it.
 * </p>
 *
 * <p>For example:
 * <pre>
 * var errors = require("errors");
 *
 * function parseData(format, data, error) {
 *   if (format == null) {
 *     error(errors.DATA_FILE_FORMAT, 'unknown data file format "{1}" to parse', format);
 *     return;
 *   }
 * </pre>
 *
 * <p><code>errors</code> (plural) is the error module (this one).
 * <code>error</code> (singular) is the error processor passed to the low-level function
 * (<code>parseData</code> in this case).</p>
 *
 * <p>The first argument to the error processor is the error code (defined in this module).
 * The second is the format, including "{<i>n</i>}" escapes for strformat.
 * Any additional arguments are substituted into the format string.</p>
 *
 * <p>Errors are usually collected for later display, using an instance of <code>Collector</code>.
 * For example, to call the parseData function above, one might do:</p>
 * <pre>
 * var errors = require("errors");
 *
 * var error = new errors.Collector();
 * var parsed = parseData(format, data, error);
 * if (error.hasErrors() {
 *   // failure
 *   for (var i = 0; i < error.errors.length; i++) {
 *     log(error.errors[i].code, error.errors[i].message);
 *     report(error.errors[i].message);
 *   }
 * }
 * </pre>
 *
 * <p>Note here also that the function may return an error indication for fatal errors
 * (such as undefined), but any warnings or other non-fatal errors will still be reported
 * through the collector.
 * Thus the example above is treating non-fatal errors the same as fatal ones that would
 * have caused parseData to return undefined.</p>
 *
 * <p>A more typical pattern would be to only fail on fatal errors, but report non-fatal
 * errors in some circumstances, such as when entering data:</p>
 * <pre>
 * var parsed = parseData(format, data, error);
 * if (parsed == null) {
 *   // fatal error
 * }
 * if (error.hasErrors() {
 *   // warnings
 * }
 * </pre>
 *
 * @module errors
 */
module.exports = {
  /**
   * Format an error for display.
   * This is used internally by other error processors.
   * @function
   * @param {number} code error code
   * @param {string} format error message format
   * @param {any} [values] values to substitute into format
   * @return {string} formatted error message
   */
  format: format,

  /**
   * Print the formatted message using console.error.
   * This is primarily for debugging and is the default error
   * processor for tests.
   * @function
   * @param {number} code error code
   * @param {string} format error message format
   * @param {any} [values] values to substitute into format
   */
  print: print,

  /**
   * Print the formatted message and throw. This is primarily for tests to ensure that
   * a process does not encounter any errors.
   * @function
   * @param {number} code error code
   * @param {string} format error message format
   * @param {any} [values] values to substitute into format
   */
  throw: throw_,

  /**
   * Discard the error.
   * @function
   * @param {number} code error code
   * @param {string} format error message format
   * @param {any} [values] values to substitute into format
   */
  ignore: ignore,

  /**
   * <p>A <code>Collector</code> is used to accumulate errors for later processing.
   * It is a function that provides the expected signature, but stores the
   * errors for later extraction.</p>
   *
   * <p>Collector is actually a function, so that it can be called to report errors.
   * However, it also has properties and functions of its own since it stores the
   * errors for later processing.</p>
   *
   * <p>In particular, it has the <code>errors</errors> array of objects, each of
   * which has a <code>code</code> and <code>message</code> property for each error reported.</p>
   * @class
   * @alias module:errors.Collector
   */
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
  DUPLICATE_POINTS:  106,
  MULTIPLE_MOTORS:   107,

  // flight simulation
  BAD_ROCKET_INFO:   201,
  BAD_MOTOR_INFO:    202,
  BAD_MOTOR_DATA:    203,

  // API
  INVALID_QUERY:     301,
  INVALID_LOGIN:     302,
};
