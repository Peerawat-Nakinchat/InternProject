import { verifyAccessToken } from '../utils/token.js';

export const verifyAccess = (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    const payload = verifyAccessToken(token);
    req.user = payload; // contains user_id, maybe company_id, role
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
