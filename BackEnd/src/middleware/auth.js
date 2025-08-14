// BackEnd/src/middleware/auth.js - Placeholder
const authMiddleware = (req, res, next) => {
  console.log('🔑 authMiddleware (placeholder) called');
  next();
};

const optionalAuth = (req, res, next) => {
  console.log('🔑 optionalAuth (placeholder) called');
  next();
};

const adminMiddleware = (req, res, next) => {
  console.log('🔑 adminMiddleware (placeholder) called');
  next();
};

module.exports = {
  authMiddleware,
  optionalAuth,
  adminMiddleware,
};
