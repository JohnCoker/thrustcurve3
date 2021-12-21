/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

/**
 * Middleware function that ensures a user is autenticated and email address is verified before proceeding.
 * @param {object} req request object
 * @param {object} res response object
 * @param {function} next continue to route function
 */
module.exports = function(req, res, next) {
  if (req.isAuthenticated() && req.user && req.user.verified)
    return next();

  req.session.loginRedirect = req.originalUrl;
  if (req.isAuthenticated())
    res.redirect('/mystuff/profile.html');
  else
    res.redirect('/mystuff/login.html');
};
