const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: '7d',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
};
