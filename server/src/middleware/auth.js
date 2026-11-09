
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  const h = req.headers.authorization;

  if (!h?.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Not logged in',
    });
  }

  try {
    const { id } = jwt.verify(
      h.split(' ')[1],
      process.env.JWT_ACCESS_SECRET
    );

    req.user = await User.findById(id);

    if (!req.user) {
      return res.status(401).json({
        message: 'User not found',
      });
    }

    next();
  } catch {
    res.status(401).json({
      message: 'Token expired or invalid',
    });
  }
};

// Optional authentication for public routes.
// If a valid token exists, attach the user.
// If no token exists, continue as a public visitor.
export const optionalProtect = async (req, res, next) => {
  const h = req.headers.authorization;

  if (!h?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const { id } = jwt.verify(
      h.split(' ')[1],
      process.env.JWT_ACCESS_SECRET
    );

    req.user = await User.findById(id);

    next();
  } catch {
    req.user = null;
    next();
  }
};

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : res.status(403).json({
        message: 'Forbidden',
      });
