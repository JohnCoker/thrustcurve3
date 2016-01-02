var express = require('express'),
    router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index', { title: 'ThrustCurve' });
});
router.get(['/index.html', '/index.shtml'], function(req, res, next) {
  res.redirect(301, '/');
});

module.exports = router;
