const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const pool = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "cpap_secret_key";

// =========================
// LOGIN (USERNAME ή EMAIL)
// =========================
router.post("/login", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Επιτρέπει login είτε με username είτε με email
    const identifier = username || email;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Username/Email και Password απαιτούνται"
      });
    }

    // Query συμβατό με το δικό σου schema (users table)
    const result = await pool.query(
      `SELECT id, username, password, role, name, email 
       FROM users 
       WHERE username = $1 OR email = $1
       LIMIT 1`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password"
      });
    }

    const user = result.rows[0];

    // Απλό password check (όπως είναι τώρα το system σου)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password"
      });
    }

    // Δημιουργία JWT Token (Enterprise Mode)
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("AUTH LOGIN ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server authentication error"
    });
  }
});

// =========================
// CREATE USER (Admin/Doctor)
// =========================
router.post("/register", async (req, res) => {
  try {
    const { username, password, role, name, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username και password απαιτούνται"
      });
    }

    const existing = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Username ήδη υπάρχει"
      });
    }

    const insert = await pool.query(
      `INSERT INTO users (username, password, role, name, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, role, name, email`,
      [
        username,
        password,
        role || "doctor",
        name || null,
        email || null
      ]
    );

    res.json({
      success: true,
      user: insert.rows[0]
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
});

module.exports = router;