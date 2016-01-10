var express = require('express'),
    router = express.Router(),
    locals = require('./locals.js');

var defaults = {
  layout: 'info',
};

router.get('/manufacturers/list.html', function(req, res, next) {
  res.render('manufacturers/list', locals(defaults, 'Manufacturer List'));
});
router.get(['/manufacturers.shtml'], function(req, res, next) {
  res.redirect(301, '/manufacturers/list.html');
});


module.exports = router;
