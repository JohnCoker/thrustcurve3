#!/bin/sh
#
# This script sets up a testing database on the local MongoDB server.
# Database name is "test" and the contents comes from the sample database.

db=test

cd $(dirname $0)
pwd
./migrate/dropall.sh "$db"
mongorestore --host=127.0.0.1 --db="$db" --gzip sample.dump
