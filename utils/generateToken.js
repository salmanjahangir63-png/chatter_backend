const jwt = require('jsonwebtoken');

// Creates a signed JWT containing the user's id.
// Used right after register/login so the client gets a token immediately.
function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

module.exports = generateToken;
