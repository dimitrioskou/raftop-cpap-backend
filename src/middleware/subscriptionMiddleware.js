const pool = require("../db");

async function requireActiveSubscription(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    // admin bypass
    if (req.user.role === "admin") {
      return next();
    }

    const userQ = await pool.query(
      `
      SELECT id, role, account_status
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [req.user.id]
    );

    if (userQ.rows.length === 0) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    const user = userQ.rows[0];

    if (user.account_status !== "active") {
      return res.status(403).json({
        error: "Account suspended",
        message: "Ο λογαριασμός είναι απενεργοποιημένος"
      });
    }

    if (user.role !== "doctor") {
      return next();
    }

    const subQ = await pool.query(
      `
      SELECT *
      FROM subscriptions
      WHERE doctor_id = $1
        AND status = 'active'
        AND end_date >= CURRENT_DATE
      ORDER BY end_date DESC
      LIMIT 1
      `,
      [req.user.id]
    );

    if (subQ.rows.length === 0) {
      return res.status(403).json({
        error: "Subscription expired",
        message: "Η συνδρομή του ιατρού έχει λήξει"
      });
    }

    req.subscription = subQ.rows[0];
    next();
  } catch (error) {
    console.error("SUBSCRIPTION MIDDLEWARE ERROR:", error);
    res.status(500).json({
      error: "Subscription check failed"
    });
  }
}

module.exports = {
  requireActiveSubscription
};