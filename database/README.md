# ThrustCurve Database

This directory contains the code that interfaces with the back-end database that stores all the
data that powers the site.

## Migrate

The __migrate__ module is a main program for transferring the ThrustCurve.org
database contents from MySQL to MongoDB via Mongoose.
It assumes both database servers are running locally.

All configuration is static here in the module file, but it depends on the
Mongoose schema defined in the __schema__ module.

## Schema

The __schema__ module contains the Mongoose schema used by the site.
This is largely a copy of the previous MySQL schema, taking some advantage
of nested structure available in MongoDB documents.


