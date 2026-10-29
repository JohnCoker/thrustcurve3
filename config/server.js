module.exports = {
  mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1/thrustcurve',
  sendGridApiKey: process.env.SENDGRID_API_KEY,
  originVerifySecret: process.env.ORIGIN_VERIFY_SECRET,
  sessionSecret: process.env.SESSION_SECRET,
};
