# ThrustCurve.org, v3

This repository contains the code that will soon power the [ThrustCurve.org](http://thrustcurve.org/) site.

[![Build Status](https://travis-ci.org/JohnCoker/thrustcurve3.svg?branch=master)](https://travis-ci.org/JohnCoker/thrustcurve3)

## Background

[ThrustCurve.org](http://thrustcurve.org/)
debuted in 1998 as a repository for simulator files generated from
actual motor firing data provided by the
[Tripoli Rocketry Association](http://www.tripoli.org) (TRA).
At that time, the goal was to provide accurate simulator files converted directly
from the data obtained at the motor test stand.
I was able to get data for most TRA-certified motors,
but the [National Association of Rocketry](http://www.nar.org) (NAR)
was not willing to make their data available.

Subsequently, TRA stopped making data available and the site languished.
There was still the original set of generated files, but it quickly became outdated
as new motors were introduced and new motor manufactuers entered the market.
As a stop-gap measure, I added a page to which people could contribute data
from other sources (usually from the motor manufacturer).

I had thought repeatedly about changing the format of the site to being
organized around the entire set of certified motors from all three organizations.
(The
[Canadian Association of Rocketry](http://www.canadianrocketry.org)
(CAR) entered the certification business during that time as well.)
Good intentions finally turned into action in 2006 when I started working on
the first programmatic site (v2).

The new model turned the old site inside out.
Instead of being driven by motors for which I had data, the list of motors is all the ones
that have been certified,
mosty from the [NAR comprehensive list](http://nar.org/SandT/pdf/CombinedList.pdf).
Additional information is pulled from the web sites of the three certification
organizations to fill in the details.

 * [N.A.R. Standards & Testing](http://www.nar.org/standards-and-testing-committee/)
 * [Tripoli Motor Testing](http://www.tripoli.org/)
 * [C.A.R. Motor Certification Committee](http://www.canadianrocketry.org/mcc_about.php)

This repository contains the source for the third iteration of the site.
The v2 implementation was in Java/JSP, which by 2015 had become dated, was getting hard
to maintain, and my hosting options were limited.
So, I decided to re-implement it using current web technologies.

## V3 Stack

The v2 implementation was all server-side rendered using Java back-end code and pages which
were either static or rendered via [JSP](https://en.wikipedia.org/wiki/JavaServer_Pages).
The data on motors, simulator files, contributors and other miscellany were stored in
[MySQL](http://dev.mysql.com/).

For an app like this, Node.js is a natural platform for the server side.

The database will either remain MySQL or switch to [MongoDB](https://www.mongodb.com/).
While MongoDB seems to be more common for Node.js sites nowadays, I remain skeptical in general.
For this site in particular there's no advantage, and several disadvantages, to a schema-less DB.
Some of these can be patched up using [Mongoose](http://mongoosejs.com/), but that just makes
me wonder why we gave up the structure in the first place.

I didn't want to go entirely client-side rendering because I wanted the site to be SEO-friendly,
but I did want to have the option of higher interactivity in the browser.
Initially, I was looking at [AngularJS](https://angularjs.org/), but their approach is a bit too
radically client-side, plus 2.0 is still immature.
[React](https://facebook.github.io/react/) seemed like a better choice for my needs,
providing a good abstraction without sacrificing server-side rendering.

In the end, all of the full-featured frameworks just felt too complex and cumbersome and I
went back to a simpler structure of [Express](http://expressjs.com/) with
Handlebars as the template engine.


## Source Organization

The top-level directory is the web application that powers the site, using the
[standard Express layout](http://expressjs.com/en/starter/generator.html).

Other directories contain small Node.js modules that implement the logic behind the routes.
Most modules are quite small (with a single file being typical).

```
thrustcurve3
├── artwork
├── bin
├── config
├── database
│   ├── accesslog
│   ├── migrate
│   └── schema
├── lib
│   ├── crawlers
│   ├── errors
│   ├── helpers
│   ├── prefs
│   └── units
├── public
│   ├── download
│   ├── images
│   ├── javascripts
│   └── stylesheets
├── routes
├── simulate
│   ├── analyze
│   ├── flightsim
│   └── parsers
└── views
    ├── contributors
    ├── info
    ├── layouts
    ├── manufacturers
    ├── motors
    ├── mystuff
    └── simfiles
```


## License

This software is licensed under the [ISC license](https://opensource.org/licenses/ISC); see [LICENSE](LICENSE) for more info.
