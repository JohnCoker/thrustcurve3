# API Testing

These tests are not part of `npm run test:lib`, since they require a
MongoDB server running with the sample database and the app listening on port 3000.

Load the sample data with [testdb.sh](../../database/testdb.sh), start the server
with `bin/www-test`, then run `npm run test:api`. GitHub Actions does this
against the committed sample dump.

There are spot-checks done for key things which test the particular API, but
the main test is the API responses are comitted and the entire response is
compared to the prior blessed version.
