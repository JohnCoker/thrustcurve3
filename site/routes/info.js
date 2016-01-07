var express = require('express'),
    router = express.Router();

var defaults = {
  layout: 'info',
};

function locals(custom) {
  var merged = {},
      p;

  for (p in defaults) {
    if (defaults.hasOwnProperty(p) && !custom.hasOwnProperty(p))
      merged[p] = defaults[p];
  }

  for (p in custom) {
    if (custom.hasOwnProperty(p) && custom[p] != null)
      merged[p] = custom[p];
  }

  return merged;
}

function simpleLocals(title) {
  return locals({ title: title });
}

router.get('/info/api.html', function(req, res, next) {
  res.render('info/api', simpleLocals('ThrustCurve API'));
});
router.get(['/searchapi.html', '/searchapi.shtml'], function(req, res, next) {
  res.redirect(301, '/info/api.html');
});

router.get('/info/background.html', function(req, res, next) {
  res.render('info/background', simpleLocals('About this Site'));
});
router.get('/background.shtml', function(req, res, next) {
  res.redirect(301, '/info/background.html');
});

router.get('/info/certification.html', function(req, res, next) {
  res.render('info/certification', simpleLocals('Motor Certification'));
});
router.get('/certification.shtml', function(req, res, next) {
  res.redirect(301, '/info/certification.html');
});

router.get('/info/contribute.html', function(req, res, next) {
  res.render('info/contribute', simpleLocals('Contribute Data'));
});
router.get('/contribute.shtml', function(req, res, next) {
  res.redirect(301, '/info/contribute.html');
});

router.get('/info/glossary.html', function(req, res, next) {
  res.render('info/glossary', simpleLocals('Rocket Motor Jargon'));
});
router.get('/glossary.shtml', function(req, res, next) {
  res.redirect(301, '/info/glossary.html');
});

router.get('/info/mobile.html', function(req, res, next) {
  res.render('info/mobile', simpleLocals('Smart Phone App'));
});
router.get('/mobile.shtml', function(req, res, next) {
  res.redirect(301, '/info/mobile.html');
});

router.get('/info/motorstats.html', function(req, res, next) {
  res.render('info/motorstats', simpleLocals('Motor Statistics'));
});
router.get('/motorstats.shtml', function(req, res, next) {
  res.redirect(301, '/info/motorstats.html');
});

router.get('/info/raspformat.html', function(req, res, next) {
  res.render('info/raspformat', simpleLocals('RASP File Format'));
});
router.get('/raspformat.shtml', function(req, res, next) {
  res.redirect(301, '/info/raspformat.html');
});

router.get('/info/simulation.html', function(req, res, next) {
  res.render('info/simulation', simpleLocals('Flight Simulation'));
});
router.get('/simulation.shtml', function(req, res, next) {
  res.redirect(301, '/info/simulation.html');
});

router.get('/info/simulators.html', function(req, res, next) {
  res.render('info/simulators', simpleLocals('Flight Simulators'));
});
router.get('/simulators.shtml', function(req, res, next) {
  res.redirect(301, '/info/simulators.html');
});

router.get('/info/tctracer.html', function(req, res, next) {
  res.render('info/tctracer', simpleLocals('Thrust Curve Tracer'));
});
router.get('/tctracer.shtml', function(req, res, next) {
  res.redirect(301, '/info/tctracer.html');
});

module.exports = router;
