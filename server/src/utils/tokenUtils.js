import jwt from 'jsonwebtoken';

const isProd = process.env.NODE_ENV === 'production';

export const signAccess = (user) =>
  jwt.sign(
    { id: user._id },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

export const signRefresh = (user) =>
  jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

export const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 3600 * 1000,
};