export const allowRoles = (...roles) => {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(403).json({ error: 'Role missing' });
    if (!roles.includes(role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
};
