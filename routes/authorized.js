/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const schema = require('../database/schema');

/**
 * Middleware function generator that ensures a user has specified permission(s) before proceeding.
 * Either one or more permissions should be specified as individual arguments to the function,
 * which will then return an Expression middleware function that verifies the user is logged in
 * and those permissions.
 *
 * See the schema module for storage of these permissions as booleans in contributor.permissions.
 *
 * @param {...string} perms individual permissions required
 * @return {function} middleware function to check those permissions
 */
module.exports = function() {
  var perms = [],
      n, p, i;

  // canonicalize the permissions
  if (arguments.length < 1)
    throw new Error('authorized: no permissions specified');
  for (i = 0; i < arguments.length; i++) {
    n = arguments[i];
    p = schema.getPermissionKey(n);
    if (p == null)
      throw new Error('authorized: invalid permission "' + n + '"');

    perms.push(p);
  }

  // build a middleware function that validates these permissions
  return function(req, res, next) {
    var auth, i;

    // user must be authenticated
    if (!req.isAuthenticated()) {
      req.session.loginRedirect = req.originalUrl;
      res.redirect('/mystuff/login.html');
    }

    // user must have all the specified permissions
    auth = true;
    for (i = 0; i < perms.length; i++) {
      if (!req.user.hasPermission(perms[i]))
        auth = false;
    }
    if (!auth) {
      res.status(403);
      res.render('error', {
        title: 'Unauthorized Access',
        layout: 'home',
        url: req.url,
        status: 403,
        message: 'The logged in user does not have permission to perform the requested operation.'
      });
    } else {
      // continue with the request
      return next();
    }
  };
};
