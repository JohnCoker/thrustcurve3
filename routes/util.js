/*
 * Copyright 2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      router = express.Router(),
      metadata = require('../lib/metadata'),
      ranking = require('../database/ranking');

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

      res.type('application/xml');
      res.send(s);
    }));
  });
});

const INTRO = `\
# ThrustCurve.org Full Index

> The authoritative source for rocket motor thrust data and simulation files (.eng, .rse).

Here you will find manufacturer specs, certified performance data and other info on commercial model rocket motors
and high-power rocket motors. Most importantly, you can download thrust curves for use with rocket flight simulators
(RockSim and OpenRocket among others).
`;

router.get('/llms-full.txt', function(req, res, next) {
  const origin = `https://${process.env.DOMAIN}`;
  metadata.getManufacturers(req, function(manufacturers) {
    metadata.getAvailableMotors(req, function(available) {
      // need overall ranking for popular motors
      ranking.build(req.db, req.success(function(ranking) {
        const popularIds = ranking.overall.motors.map(m => m._motor);
        req.db.Motor.find({ _id: { $in: popularIds } }).exec(req.success(function(popular) {
          let s = INTRO;

          // static pages in two groups
          let lastGroup;
          StaticMap.forEach(entry => {
            const group = entry.path.startsWith('/motor') ? 'feature' : 'info';
            const title = group == 'info' ? 'General Motor Information' : 'Motor Finding Features';
            if (group != lastGroup) {
              s += `\n## ${title}\n`;
              lastGroup = group;
            }
            s += `- [${entry.title}](${origin}${entry.path}): ${entry.desc}\n`;
          });

          // manufacturers
          s += `\n## Motor Manufacturers\n`;
          manufacturers.forEach(mfr => {
            if (!mfr.active)
              return;
            s += `- [${mfr.abbrev}](${origin}/manufacturers/${mfr.abbrev}/details.html): ${mfr.name}\n`;
          });
          s += `\nSee more at the [Motor Manufacturers page](${origin}/manufacturers/).\n`;

          // impulse classes
          s += `\n## Motor Impulse Classes\n`;
          available.impulseClasses.forEach(cls => {
            s += `- [${cls}](${origin}/motors/search.html?impulseClass=${cls}): search for ${cls} motors\n`;
          });

          // most popular motors
          s += `\n## Most Popular Motors\n`;
          popular.forEach((motor, i) => {
            const mfr = manufacturers.byId(motor._manufacturer);
            const path = ('/motors/' +
                          encodeURIComponent(mfr.abbrev) + '/' +
                          encodeURIComponent(motor.designation) + '/');
            const type = motor.type == 'SU' ? 'single-use' : motor.type;
            s += `${i + 1}. [${mfr.abbrev} ${motor.commonName}](${origin}${path}): ${mfr.name} ${motor.designation} ${type} ${motor.impulseClass} motor.\n`;
          });
          s += `\nSee more at the [Popular Motors page](${origin}/motors/popular.html).\n`;

          res.type('text/plain')
             .set('X-Robots-Tag', 'noindex')
             .send(s);
        }));
      }));
    });
  });
});

module.exports = router;
