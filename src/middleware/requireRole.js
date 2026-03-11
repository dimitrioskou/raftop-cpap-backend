module.exports = (role) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "No token" });
  if (req.user.role !== role) return res.status(403).json({ error: "Forbidden" });
  next();
};
