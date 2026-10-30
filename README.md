# ThrustCurve.org, v3

This repository contains the code that powers the [ThrustCurve.org](https://www.thrustcurve.org/) site.

[![Tests](https://github.com/JohnCoker/thrustcurve3/actions/workflows/tests.yml/badge.svg)](https://github.com/JohnCoker/thrustcurve3/actions/workflows/tests.yml)

The server is Node.js with [Express](https://expressjs.com/) and Handlebars.
Data is stored in [MongoDB](https://www.mongodb.com/) through [Mongoose](https://mongoosejs.com/).
Ideas for new features are listed on [the to-do page](TODO.md).

## Running

You need Node.js and a MongoDB server listening on `127.0.0.1`.
The app uses the `thrustcurve` database unless `MONGODB_URI` is set.

```
npm install
mongorestore --host=127.0.0.1 --db=thrustcurve --gzip database/sample.dump
npm start
```

Then open [http://localhost:3000](http://localhost:3000).
The sample data is Estes, AeroTech, and Kosdon motors.
Log in as `flier.fred@gmail.com` or `admin.adam@gmail.com` with the password `secret`.
See [database/README.md](database/README.md) for what else is in that dump.

## Source

The top of the repo is an Express app (`routes`, `views`, `public`, `bin`).
The other directories are small modules next to that:

- `database` is the Mongoose schema and the sample data.
- `simulate` parses simulator files and runs flight simulations.
- `render` builds graphs, SVG, and spreadsheets.
- `lib` holds helpers shared by the routes.
- `api` is the [`@thrustcurve/api1`](https://www.npmjs.com/package/@thrustcurve/api1) client.
- `mobile` is the Cordova app (unmaintained).
- `spec` holds the API and UI tests.

## Tests

`npm run test:lib` runs the unit tests.
`npm run test:e2e` and `npm run test:api` need the database from [database/testdb.sh](database/testdb.sh).
Details are in [spec/web](spec/web/) and [spec/api](spec/api/).

GitHub Actions runs the unit tests, and the API and UI tests against that database.

## License

This software is licensed under the [ISC license](https://opensource.org/licenses/ISC); see [LICENSE](LICENSE) for more info.
