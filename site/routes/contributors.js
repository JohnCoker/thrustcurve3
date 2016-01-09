var express = require('express'),
    router = express.Router(),
    locals = require('./locals.js');

var defaults = {
  layout: 'info',
};

router.get('/contributors/list.html', function(req, res, next) {
  res.render('contributors/list', locals(defaults, 'Data Contributors'));
});
router.get(['/contribsearch.jsp'], function(req, res, next) {
  res.redirect(301, '/contributors/list.html');
});


module.exports = router;
