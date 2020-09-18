# API Testing

These tests are not run as part of the standard suite, since they require a
MongoDB server to be running with the sample database.

For now, the tests can be run manually by setting up the test database with
[testdb.sh](../../database/testdb.sh) and running these tests with
`jasmine api-spec.js`

There are spot-checks done for key things which test the particular API, but
the main test is the API responses are comitted and the entire response is
compared to the prior blessed version.
