/*
 * Copyright 2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      router = express.Router(),
      metadata = require('../lib/metadata'),
      ranking = require('../database/ranking'),
      cache = require('../lib/cache');

/*
 * /sitemap.xml
 * Generate site map dynamically from static routes and for all manufacturers and motors.
 */
const StaticUpdated = new Date(),
      MfrPriority = 0.25,
      MotorPriority = 0.75;

const StaticMap = [
  // main feature pages
  {
    path: '/motors/search.html',
    priority: 1.0,
    title: 'Search Motors',
    desc: 'Traditional search based on name and other properties of rocket motors.'
  },
  {
    path: '/motors/guide.html',
    priority: 1.0,
    title: 'Match a Rocket',
    desc: 'Enter simple information about your rocket and get a listing of the motors that work.'
  },
  {
    path: '/motors/browser.html',
    priority: 1.0,
    title: 'Browse by Type',
    desc: 'Find motors of interest by successively narrowing down categories.'
  },
  {
    path: '/motors/updates.html',
    priority: 1.0, changefreq: 'weekly',
    title: 'Recent Updates',
    desc: 'See the most recent database updates.'
  },
  {
    path: '/motors/popular.html',
    priority: 1.0, changefreq: 'weekly',
    title: 'Most Popular',
    desc: 'See the motors other people are looking at and which are their favorite.'
  },

  // information pages
  {
    path: '/info/api.html',
    priority: 0.5,
    title: 'ThrustCurve API',
    desc: 'Programmatic API for accessing manufacturer, motor and simulator file data.'
  },
  {
    path: '/info/background.html',
    priority: 0.5,
    title: 'About this Site',
    desc: 'History and motivation for building and maintaining the site.'
  },
  {
    path: '/info/privacy.html',
    priority: 0.5,
    title: 'Privacy Policy',
    desc: 'ThrustCurve.org does not share or monetize your data in any way.'
  },
  {
    path: '/info/certification.html',
    priority: 0.5,
    title: 'Motor Certification',
    desc: 'History of the motor certification organizations.'
  },
  {
    path: '/info/contribute.html',
    priority: 0.5,
    title: 'Contribute Data',
    desc: 'How to contribute motor simulation files.'
  },
  {
    path: '/info/glossary.html',
    priority: 0.5,
    title: 'Rocket Motor Jargon',
    desc: 'A glossary of terms used on the site and are standard for the hobby.'
  },
  {
    path: '/info/motorstats.html',
    priority: 0.5,
    title: 'Motor Statistics',
    desc: 'Explanation of the important characteristics of the performance of a motor.'
  },
  {
    path: '/info/raspformat.html',
    priority: 0.5,
    title: 'RASP File Format',
    desc: 'Documentation of the oldest and most common simulation file format.'
  },
  {
    path: '/info/simulation.html',
    priority: 0.5,
    title: 'Flight Simulation',
    desc: 'Explanation of how rocket flight simulation works.'
  },
  {
    path: '/info/simulators.html',
    priority: 0.5,
    title: 'Flight Simulators',
    desc: 'A listing of flight simulator programs.'
  },
  {
    path: '/info/tctracer.html',
    priority: 0.5,
    title: 'Thrust Curve Tracer',
    desc: 'An application that helps you create a RASP file from a printed thrust curve.'
  },
  {
    path: '/manufacturers',
    priority: 0.5,
    title: 'Motor Manufacturers',
    desc: 'The list of active motor manufacturers.'
  },
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
      var s = '', i;

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

      res.type('application/xml')
         .set('Cache-Control', cache.sitemap)
         .send(s);
    }));
  });
});

/*
 * /.well-known/change-password
 * Password managers request this and follow the redirect to the signed-in
 * profile page, which has the change-password form.
 * https://w3c.github.io/webappsec-change-password-url/
 */
router.get('/.well-known/change-password', function(req, res) {
  res.redirect(302, '/mystuff/profile.html');
});

module.exports = router;
