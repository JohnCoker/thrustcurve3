/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var express = require('express'),
    router = express.Router(),
    metadata = require('../lib/metadata'),
    locals = require('./locals.js'),
    authorized = require('./authorized.js');

var defaults = {
  layout: 'index',
};

/*
 * /sitemap.xml
 * Generate site map dynamically from static routes and for all manufacturers and motors.
 */
const StaticUpdated = new Date(),
      MfrPriority = 0.25,
      MotorPriority = 0.75;

const StaticMap = [
  // main feature pages
  { path: '/motors/search.html',      priority: 1.0 },
  { path: '/motors/guide.html',       priority: 1.0 },
  { path: '/motors/browser.html',     priority: 1.0 },
  { path: '/motors/updates.html',     priority: 1.0, changefreq: 'weekly' },
  { path: '/motors/popular.html',     priority: 1.0, changefreq: 'weekly' },

  // information pages
  { path: '/info/api.html',           priority: 0.5 },
  { path: '/info/background.html',    priority: 0.5 },
  { path: '/info/certification.html', priority: 0.5 },
  { path: '/info/contribute.html',    priority: 0.5 },
  { path: '/info/glossary.html',      priority: 0.5 },
  { path: '/info/mobile.html',        priority: 0.5 },
  { path: '/info/motorstats.html',    priority: 0.5 },
  { path: '/info/raspformat.html',    priority: 0.5 },
  { path: '/info/simulation.html',    priority: 0.5 },
  { path: '/info/simulators.html',    priority: 0.5 },
  { path: '/info/tctracer.html',      priority: 0.5 },
];

function sitemapLastMod(updated) {
  var y = updated.getFullYear().toFixed(),
      m = (updated.getMonth() + 1).toFixed(),
      d = updated.getDate().toFixed();

  if (m.length < 2)
    m = '0' + m;
  if (d.length < 2)
    d = '0' + d;
  return y + '-' + m + '-' + d;
}

function sitemapURL(info) {
  var s = '<url>\n';

  s += '  <loc>' + 'https://www.thrustcurve.org' + info.path + '</loc>\n';

  if (info.updated)
    s += '  <lastmod>' + sitemapLastMod(info.updated) + '</lastmod>\n';

  if (info.priority > 0)
    s += '  <priority>' + info.priority.toFixed(2) + '</priority>\n';

  s += '  <changefreq>' + (info.changefreq ? info.changefreq : 'monthly') + '</changefreq>\n';

  s += '</url>\n';
  return s;
}

router.get('/sitemap.xml', function(req, res, next) {
  metadata.getManufacturers(req, function(manufacturers) {
    var q = { availability: { $in: req.db.schema.MotorAvailableEnum } };
    req.db.Motor.find(q, undefined, { sort: { _manufacturer: 1, designation: 1 } })
                .select('_manufacturer designation updatedAt')
                .exec(req.success(function(motors) {
      var s = '', info, i;

      s += '<?xml version="1.0" encoding="UTF-8"?>\n';
      s += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      // static pages
      for (i = 0; i < StaticMap.length; i++) {
        StaticMap[i].updated = StaticUpdated;
        s += sitemapURL(StaticMap[i]);
      }

      // manufacturers
      for (i = 0; i < manufacturers.length; i++) {
        s += sitemapURL({
          path: '/manufacturers/' + encodeURIComponent(manufacturers[i].abbrev) + '/details.html',
          updated: manufacturers[i].updatedAt,
          priority: MfrPriority
        });
      }

      // motors
      for (i = 0; i < motors.length; i++) {
        s += sitemapURL({
          path: '/motors/' +
                encodeURIComponent(manufacturers.byId(motors[i]._manufacturer).abbrev) +
                '/' +
                encodeURIComponent(motors[i].designation) +
                '/',
          updated: motors[i].updatedAt,
          priority: MotorPriority
        });
      }

      s += '</urlset>';
      res.status(200).type('text/xml').send(s);
    }));
  });
});

module.exports = router;
