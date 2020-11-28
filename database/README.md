# ThrustCurve Database

This directory contains the code that interfaces with the back-end database that stores all the
data that powers the site.

## Access Log

The __accesslog__ module is a main program for loading Apache access logs from the old
web site as entries in the MotorView model, which is used to track popular motors.

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


## Sample Data

Some sample data has been saved in
[mongodump](https://docs.mongodb.org/manual/reference/program/mongodump/)
format for local testing.
It contains all available Estes and AeroTech motors as of January 2016, plus (OOP) Kosdon motors.

Note that there is no real user data. Three example contributors are defined:
  - **busy.joe@gmail.com**
    contributed all the data files and notes,
  - **flier.fred@gmail.com**
    has preferences set and three rockets defined,
  - **admin.adam@gmail.com**
    has full admin rights.

The last two are meant to be used in testing and you can login with the password "secret".

To load the data into a local instance of MongoDB:
```
mongorestore --db=thrustcurve --gzip sample.dump
```

Note that the app uses the database "thrustcurve" by default.

If you need to clear an existing database, use the script in the migrate directory:
```
./migrate/dropall.sh
```

For local API testing, use the `testdb.sh` script, which resets and loads the sample data into
the "test" database. [The API tests](../spec/api) expect the server to be running with a fresh
load of this sample DB.
