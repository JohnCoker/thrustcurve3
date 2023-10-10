module.exports = {
  mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1/thrustcurve',
  sendGridApiKey: process.env.SENDGRID_API_KEY,
};
