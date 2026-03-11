const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticateToken, requireAdmin } = require("../middleware/authMiddleware");

// =====================================
// GET ALL SUBSCRIPTIONS
// =====================================
router.get("/subscriptions", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        s.id,
        s.doctor_id,
        s.plan_name,
        s.price_yearly,
        s.billing_cycle,
        s.status,
        s.start_date,
        s.end_date,
        s.auto_renew,
        s.notes,
        s.created_at,
        u.username,
        u.name,
        u.email,
        u.account_status
      FROM subscriptions s
      LEFT JOIN users u
        ON s.doctor_id = u.id
      ORDER BY s.created_at DESC
      `
    );

    res.json({
      success: true,
      subscriptions: result.rows
    });
  } catch (error) {
    console.error("GET SUBSCRIPTIONS ERROR:", error);
    res.status(500).json({
      error: "Failed to load subscriptions"
    });
  }
});

// =====================================
// CREATE SUBSCRIPTION
// =====================================
router.post("/subscriptions", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      doctor_id,
      plan_name,
      price_yearly,
      billing_cycle,
      status,
      start_date,
      end_date,
      auto_renew,
      notes
    } = req.body;

    if (!doctor_id || !plan_name || !end_date) {
      return res.status(400).json({
        error: "doctor_id, plan_name, end_date απαιτούνται"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO subscriptions
      (
        doctor_id,
        plan_name,
        price_yearly,
        billing_cycle,
        status,
        start_date,
        end_date,
        auto_renew,
        notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        doctor_id,
        plan_name,
        price_yearly || 0,
        billing_cycle || "yearly",
        status || "active",
        start_date || new Date(),
        end_date,
        auto_renew || false,
        notes || null
      ]
    );

    await pool.query(
      `
      UPDATE users
      SET account_status = 'active'
      WHERE id = $1
      `,
      [doctor_id]
    );

    res.json({
      success: true,
      subscription: result.rows[0]
    });
  } catch (error) {
    console.error("CREATE SUBSCRIPTION ERROR:", error);
    res.status(500).json({
      error: "Failed to create subscription"
    });
  }
});

// =====================================
// UPDATE SUBSCRIPTION
// =====================================
router.put("/subscriptions/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const subscriptionId = req.params.id;
    const {
      plan_name,
      price_yearly,
      billing_cycle,
      status,
      start_date,
      end_date,
      auto_renew,
      notes
    } = req.body;

    const result = await pool.query(
      `
      UPDATE subscriptions
      SET
        plan_name = $1,
        price_yearly = $2,
        billing_cycle = $3,
        status = $4,
        start_date = $5,
        end_date = $6,
        auto_renew = $7,
        notes = $8
      WHERE id = $9
      RETURNING *
      `,
      [
        plan_name,
        price_yearly,
        billing_cycle,
        status,
        start_date,
        end_date,
        auto_renew,
        notes,
        subscriptionId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Subscription not found"
      });
    }

    const sub = result.rows[0];

    const accountStatus =
      sub.status === "active" && new Date(sub.end_date) >= new Date()
        ? "active"
        : "suspended";

    await pool.query(
      `
      UPDATE users
      SET account_status = $1
      WHERE id = $2
      `,
      [accountStatus, sub.doctor_id]
    );

    res.json({
      success: true,
      subscription: result.rows[0]
    });
  } catch (error) {
    console.error("UPDATE SUBSCRIPTION ERROR:", error);
    res.status(500).json({
      error: "Failed to update subscription"
    });
  }
});

// =====================================
// SUSPEND DOCTOR ACCOUNT
// =====================================
router.put("/doctors/:id/suspend", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const doctorId = req.params.id;

    await pool.query(
      `
      UPDATE users
      SET account_status = 'suspended'
      WHERE id = $1
      `,
      [doctorId]
    );

    await pool.query(
      `
      UPDATE subscriptions
      SET status = 'suspended'
      WHERE doctor_id = $1
        AND status = 'active'
      `,
      [doctorId]
    );

    res.json({
      success: true,
      message: "Doctor account suspended"
    });
  } catch (error) {
    console.error("SUSPEND DOCTOR ERROR:", error);
    res.status(500).json({
      error: "Failed to suspend doctor"
    });
  }
});

// =====================================
// ACTIVATE DOCTOR ACCOUNT
// =====================================
router.put("/doctors/:id/activate", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const doctorId = req.params.id;

    await pool.query(
      `
      UPDATE users
      SET account_status = 'active'
      WHERE id = $1
      `,
      [doctorId]
    );

    await pool.query(
      `
      UPDATE subscriptions
      SET status = 'active'
      WHERE doctor_id = $1
        AND end_date >= CURRENT_DATE
      `,
      [doctorId]
    );

    res.json({
      success: true,
      message: "Doctor account activated"
    });
  } catch (error) {
    console.error("ACTIVATE DOCTOR ERROR:", error);
    res.status(500).json({
      error: "Failed to activate doctor"
    });
  }
});

// =====================================
// BILLING REVENUE DASHBOARD
// =====================================
router.get("/revenue", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalsQ = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_subscriptions,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active_subscriptions,
        COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended_subscriptions,
        COALESCE(SUM(price_yearly) FILTER (WHERE status = 'active'), 0) AS active_revenue_yearly
      FROM subscriptions
      `
    );

    const byPlanQ = await pool.query(
      `
      SELECT
        plan_name,
        COUNT(*)::int AS count,
        COALESCE(SUM(price_yearly), 0) AS revenue
      FROM subscriptions
      GROUP BY plan_name
      ORDER BY revenue DESC
      `
    );

    const expiringQ = await pool.query(
      `
      SELECT
        s.id,
        s.doctor_id,
        s.plan_name,
        s.end_date,
        u.name,
        u.email
      FROM subscriptions s
      LEFT JOIN users u
        ON s.doctor_id = u.id
      WHERE s.end_date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY s.end_date ASC
      `
    );

    res.json({
      success: true,
      summary: totalsQ.rows[0],
      by_plan: byPlanQ.rows,
      expiring_soon: expiringQ.rows
    });
  } catch (error) {
    console.error("REVENUE DASHBOARD ERROR:", error);
    res.status(500).json({
      error: "Failed to load revenue dashboard"
    });
  }
});

module.exports = router;