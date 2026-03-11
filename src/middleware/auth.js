const jwt = require("jsonwebtoken");

const JWT_SECRET = "raftop_secret_key";

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
}

function requireDoctor(req, res, next) {
  if (req.user.role !== "doctor") {
    return res.status(403).json({
      error: "Doctor access only"
    });
  }
  next();
}

module.exports = { authenticateToken, requireDoctor };