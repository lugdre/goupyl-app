const jwt = require('jsonwebtoken');

// Même chaîne de fallback que utils/encryption.js : certains environnements
// définissent JWT_ACCESS_SECRET au lieu de JWT_SECRET.
const accessSecret = () => process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;

const generateAccessToken = (user) =>
  jwt.sign(
    { userId: user.id, role: user.role },
    accessSecret(),
    { expiresIn: '15m' }
  );

const generateRefreshToken = (user) =>
  jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

const verifyAccessToken = (token) =>
  jwt.verify(token, accessSecret());

const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
