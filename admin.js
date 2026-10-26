
const { initializeApp, cert } = require('firebase-admin/app');

const serviceAccount = require('./service_account.json');

const app = initializeApp({
  credential: cert(serviceAccount),
});

module.exports.admin = app;
