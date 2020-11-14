module.exports = {
  mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost/thrustcurve',
  sendGridApiKey: process.env.SENDGRID_API_KEY,
};
