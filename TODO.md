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

## Administration

In the prior site, there were pages for entering and updating motor information,
but no pages for administering certification organizations or motor manufacturers.
(It was easily enough done in SQL, but probably impractical in MongoDB.)

## Old Site Pages

| old page            | new page                   | notes |
|:--------------------|:---------------------------|:------|
| advsearch.jsp       |                            | internal page |
| apidemo.shtml       |                            | |
| background.shtml    | info/background.html       | |
| bbcode.shtml        |                            | |
| browser.jsp         | browser.html               | motor browser |
| browser.shtml       | browser.html               | motor browser |
| certification.shtml | info/certification.html    | |
| contribsearch.jsp   |                            | |
| contribute.shtml    | info/contribute.html       | |
| deletenote.jsp      |                            | |
| deleterocket.jsp    |                            | |
| deletesimfile.jsp   |                            | |
| download.jsp        | simfiles/*/download.html   | |
| errors.shtml        | errors.html                | |
| forgotpasswd.jsp    |                            | |
| glossary.shtml      | info/glossary.html         | |
| guidehelp.shtml     | motors/guide.html          | motor guide |
| guidepage.jsp       | motors/guide.html          | motor guide|
| index.shtml         | index.html                 | |
| login.jsp           | mystuff/login.html         | |
| mfrsearch.jsp       | manufacturers/             | |
| missingdata.jsp     |                            | |
| missingstats.jsp    |                            | |
| mobile.shtml        | info/mobile.html           | |
| motorguide.jsp      | motors/guide.html          | motor guide|
| motorsearch.jsp     | motors/earch.html          | |
| motorstats.shtml    | info/motorstats.html       | |
| notfound.jsp        | notfound.html              | |
| notfound.shtml      | notfound.html              | |
| outbox.jsp          |                            | |
| raspformat.shtml    | info/raspformat.html       | |
| search.shtml        | motors/search.html         | attribute search |
| searchapi.shtml     | info/searchapi.html        | |
| searchpage.jsp      | motors/search.html         | attribute search |
| servererror.jsp     |                            | |
| simfilesearch.jsp   | simfiles/*/                | |
| simulation.shtml    | info/simulation.html       | |
| simulators.shtml    | info/simulators.html       | |
| tctracer.shtml      | info/tctracer.html         | |
| updatecontrib.jsp   |                            | |
| updatemotor.jsp     | motors/*/edit.html         | |
| updatenote.jsp      |                            | |
| updaterocket.jsp    |                            | |
| updates.jsp         | motors/updates.html        | |
| updatesimfile.jsp   |                            | |
