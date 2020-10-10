# To-Do

All of the functionality of the old site should be available in the new (plus more, of course).
This page lists the things supported in the old site which haven't yet been reimplemented plus ideas for new features.

## General

 * flag motors favorited by other users

## Contribution

 * add/edit/delete motor and simfile notes

## Search

 * search by motor case
 * search by propellant type
 * search by propellant color
 * compare single motor to others in search result (a la "Compared with" on motor page)

## Motor Guide

 * use visual styles in spreadsheets
 * compare motors from results

## Account

 * search other contributors
 * search for entered rockets

## Administration

 * user administration

## API

Re-implement API for JSON and XML (`/api/v1`) plus backwards-compatible endpoints (`/servlets`).

 * motorguide

## Mobile App

 * update TCTG to latest Cordova
 * switch to updated (JSON) API
 * add support for saving rockets entered into the app


# Old Site Pages

Previous non-internal, non-admin pages should all redirect to ones on the new site.

Note that most of the static pages are the same, with just a consistent ".html" extension,
but have moved to the info directory.
For example "background.shtml" is now "info/background.html" (see `routes/info.js`).

This table lists all pages of the old site and will be filled in as work proceeds.

| old page            | new page                     | ✓ | area |
|:--------------------|:-----------------------------|---|:------|
| advsearch.jsp       |                              | — | internal page |
| apidemo.shtml       | info/apidemo.html            | ✓ | API |
| background.shtml    | info/background.html         | ✓ | general info |
| bbcode.shtml        |                              | — | notes |
| browser.jsp         | motors/browser.html          | ✓ | motor browser |
| browser.shtml       | motors/browser.html          | ✓ | motor browser |
| certification.shtml | info/certification.html      | ✓ | general info |
| contribsearch.jsp   | contributors/list.html       | ✓ | contribution |
| contribute.shtml    | info/contribute.html         | ✓ | general info |
| deletenote.jsp      |                              |   | contribution |
| deleterocket.jsp    | mystuff/rocket/*/delete.html | ✓ | account |
| deletesimfile.jsp   | simfiles/*/delete.html       | ✓ | contribution |
| download.jsp        | simfiles/*/download.html     | ✓ | outbox |
| errors.shtml        |                              | — | general info |
| forgotpasswd.jsp    | mystuff/forgotpasswd.html    | ✓ | account |
| glossary.shtml      | info/glossary.html           | ✓ | general info |
| guidehelp.shtml     | motors/guidehelp.html        | ✓ | motor guide |
| guidepage.jsp       | motors/guide.html            | ✓ | motor guide |
| index.shtml         | index.html                   | ✓ | home page |
| login.jsp           | mystuff/login.html           | ✓ | account |
| mfrsearch.jsp       | manufacturers/               | ✓ | manufacturers |
| missingdata.jsp     | motors/missingdata.html      | ✓ | admin |
| missingstats.jsp    | motors/missingstats.html     | ✓ | admin |
| mobile.shtml        | info/mobile.html             | ✓ | general info |
| motorguide.jsp      | motors/guide.html            | ✓ | motor guide |
| motorsearch.jsp     | motors/search.html           | ✓ | attribute search |
| motorstats.shtml    | info/motorstats.html         | ✓ | general info |
| notfound.jsp        | notfound.html                | ✓ | internal page |
| notfound.shtml      | notfound.html                | ✓ | internal page |
| outbox.jsp          | outbox/*                     | ✓ | outbox |
| raspformat.shtml    | info/raspformat.html         | ✓ | general info |
| search.shtml        | motors/search.html           | ✓ | attribute search |
| searchapi.shtml     | info/api.html                | ✓ | general info |
| searchpage.jsp      | motors/search.html           | ✓ | attribute search |
| servererror.jsp     | error.html                   | ✓ | internal page |
| simfilesearch.jsp   | simfiles/*/                  | ✓ | data files |
| simulation.shtml    | info/simulation.html         | ✓ | general info |
| simulators.shtml    | info/simulators.html         | ✓ | general info |
| tctracer.shtml      | info/tctracer.html           | ✓ | general info |
| updatecontrib.jsp   | mystuff/profile.html         | ✓ | account |
| updatemotor.jsp     | motors/*/edit.html           | ✓ | admin |
| updatenote.jsp      |                              |   | contribution |
| updaterocket.jsp    | mystuff/rocket/*/edit.html   | ✓ | account |
| updates.jsp         | motors/updates.html          | ✓ | general info |
| updatesimfile.jsp   | simfiles/*/edit.html         | ✓ | contribution |
| servlets/metadata   | api/1/metadata.*             | ✓ | API |
| servlets/search     | api/1/search.*               | ✓ | API |
| servlets/download   | api/1/download.*             | ✓ | API |
| servlets/getrockets | api/1/getrockets.*           |   | API |
| servlets/motorguide | api/1/motorguide.*           |   | API |

Note that the new site takes a more REST-style approach for data display, using paths
that contain names rather than generic pages with ID query parameters.
For example `/motorsearch.jsp?id=21` becomes `/motors/Estes/C6/`.
