# To-Do

Initially, the focus for v3 is to reproduce the functionality of v2, improving it along the way and especially
making it responsive.  The major features of the prior site all appear to be used and should be reproduced.
(See the [rocketryforum.com poll](http://www.rocketryforum.com/showthread.php?130782-ThrustCurve-org-future-directions).)

 1. name search
 2. motor guide
 3. motor browser
 4. attribute search

## Name Search

To make this easy to access, a search box is now in the header and searches both designation and common names.
Note that this uses the same infrastructure as Attribute Search, but uses the pseudo-field "name" instead of
an actual motor field.

To do:
 * make searching word-based (i.e., not exact match)

## Motor Guide

The motor guide should be re-implemented mostly as it was.

There are some enhancements that have been requested:
 * MMT adapters
 * clusters
 * limit to multiple manufacturers

## Motor Browser

The motor browser should be re-implemented mostly as it was.

## Attribute Search

The complex search has been re-implemented mostly as it was.

Enhancements requested:
 * search by motor case
 * search by propellant color

To do:
 * search by motor case
 * search by propellant type
 * diagnose search query when no matches found

## Social Pages

In addition to the prior site, the new site should have more socially focused features.

Motor details are now recorded in the database (when not from 'bots) so that the most popular
motors can be highlighted (/motors/popular.html).

Also, users should be able to mark their favorite motors.  Note only will this make those
motors easier for them to find again, but motors marked as favorites can be flagged for
everyone.

## Preferences

There were unit preferences in the old site, but they didn't affect the display of everything.
The new site should always use the user's preferred units.

## Administration

In the prior site, there were pages for entering and updating motor information,
but no pages for administering certification organizations or motor manufacturers.
(It was easily enough done in SQL, but probably impractical in MongoDB.)

To do:
 * new motor entry
 * certification org editing

## Old Site Pages

Previous non-internal, non-admin pages should all redirect to ones on the new site.

Note that most of the static pages are the same, with just a consistent ".html" extension,
but have moved to the info directory.
For example "background.shtml" is now "info/background.html" (see `routes/info.js`).

This table lists all pages of the old site and will be filled in as v3 proceeds.

| old page            | new page                   | notes |
|:--------------------|:---------------------------|:------|
| advsearch.jsp       |                            | internal page |
| apidemo.shtml       |                            | |
| background.shtml    | info/background.html       | static |
| bbcode.shtml        |                            | |
| browser.jsp         | browser.html               | motor browser |
| browser.shtml       | browser.html               | motor browser |
| certification.shtml | info/certification.html    | static |
| contribsearch.jsp   |                            | |
| contribute.shtml    | info/contribute.html       | static |
| deletenote.jsp      |                            | |
| deleterocket.jsp    |                            | |
| deletesimfile.jsp   |                            | |
| download.jsp        | simfiles/*/download.html   | |
| errors.shtml        | errors.html                | |
| forgotpasswd.jsp    | mystuff/forgotpasswd.html  | account |
| glossary.shtml      | info/glossary.html         | static |
| guidehelp.shtml     | motors/guide.html          | motor guide |
| guidepage.jsp       | motors/guide.html          | motor guide |
| index.shtml         | index.html                 | |
| login.jsp           | mystuff/login.html         | account |
| mfrsearch.jsp       | manufacturers/             | |
| missingdata.jsp     |                            | |
| missingstats.jsp    |                            | |
| mobile.shtml        | info/mobile.html           | static |
| motorguide.jsp      | motors/guide.html          | motor guide |
| motorsearch.jsp     | motors/search.html         | attribute search |
| motorstats.shtml    | info/motorstats.html       | static |
| notfound.jsp        | notfound.html              | |
| notfound.shtml      | notfound.html              | |
| outbox.jsp          |                            | |
| raspformat.shtml    | info/raspformat.html       | |
| search.shtml        | motors/search.html         | attribute search |
| searchapi.shtml     | info/searchapi.html        | |
| searchpage.jsp      | motors/search.html         | attribute search |
| servererror.jsp     |                            | |
| simfilesearch.jsp   | simfiles/*/                | |
| simulation.shtml    | info/simulation.html       | static |
| simulators.shtml    | info/simulators.html       | static |
| tctracer.shtml      | info/tctracer.html         | static |
| updatecontrib.jsp   | mystuff/profile.html       | account |
| updatemotor.jsp     | motors/*/edit.html         | admin |
| updatenote.jsp      |                            | |
| updaterocket.jsp    |                            | account |
| updates.jsp         | motors/updates.html        | |
| updatesimfile.jsp   |                            | |
