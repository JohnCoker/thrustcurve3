# ThrustCurve Libraries

This directory contains shared utility code used by various other modules.

## Crawlers

The __crawlers__ module contains a small database of robot user agents which is
consulted to determine if the current request is from a crawler/robot/spider.

## Errors

The __errors__ module contains methods for formatting and reporting errors.
This centralizes error string processing, allowing localization at some later time.
In addition to error messages, error have defined codes, which allow programmatic
processing of exceptional conditions.

## Prefs

The __prefs__ module contains methods for maintaining user preferences.
Preferences are stored in the contributor record for logged-in users of the site.

## Units

The __units__ module contains metadata on possible known known measurement types
and the possible unit choices for each.
For example, length measurements can be made in a variety of units such as
inches, or centimeters and mass measurements can be made in ounces or grams.

It also contains methods to convert units since all calculations are done in MKS,
but display is done in whatever units the user prefers.
