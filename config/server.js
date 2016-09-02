module.exports = {
  mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost/thrustcurve',
  sendGridUsername: process.env.SENDGRID_USERNAME,
  sendGridPassword: process.env.SENDGRID_PASSWORD,
};
