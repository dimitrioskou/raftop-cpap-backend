const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Έλεγχος αν υπάρχει Authorization header
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Format: Bearer TOKEN
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    // Verify JWT (ίδιο secret με login)
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secret123"
    );

    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT ERROR:", err.message);
    res.status(403).json({ error: "Invalid token" });
  }
};
