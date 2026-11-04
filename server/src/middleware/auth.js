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

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : res.status(403).json({
        message: 'Forbidden',
      });