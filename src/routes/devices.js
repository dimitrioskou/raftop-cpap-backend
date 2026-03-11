const express = require("express");
const router = express.Router();
const pool = require("../db");

// ==============================
// GET ALL DEVICES
// ==============================
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        d.id,
        d.serial_number,
        d.brand,
        d.model,
        d.pressure_min,
        d.pressure_max,
        d.setup_date,
        d.status,
        d.patient_id,
        d.created_at,
        p.name AS patient_name
      FROM cpap_devices d
      LEFT JOIN patients p
        ON d.patient_id = p.id
      ORDER BY d.created_at DESC
    `);

    res.json({
      success: true,
      devices: result.rows
    });
  } catch (error) {
    console.error("GET DEVICES ERROR:", error);
    res.status(500).json({
      error: "Failed to load devices"
    });
  }
});

// ==============================
// GET DEVICE BY ID
// ==============================
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        d.*,
        p.name AS patient_name
      FROM cpap_devices d
      LEFT JOIN patients p
        ON d.patient_id = p.id
      WHERE d.id = $1
      LIMIT 1
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Device not found"
      });
    }

    res.json({
      success: true,
      device: result.rows[0]
    });
  } catch (error) {
    console.error("GET DEVICE ERROR:", error);
    res.status(500).json({
      error: "Failed to load device"
    });
  }
});

// ==============================
// CREATE DEVICE
// ==============================
router.post("/", async (req, res) => {
  try {
    const {
      serial_number,
      brand,
      model,
      pressure_min,
      pressure_max,
      setup_date,
      status,
      patient_id
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO cpap_devices
      (
        serial_number,
        brand,
        model,
        pressure_min,
        pressure_max,
        setup_date,
        status,
        patient_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [
        serial_number,
        brand || null,
        model || null,
        pressure_min || null,
        pressure_max || null,
        setup_date || null,
        status || "active",
        patient_id || null
      ]
    );

    if (patient_id) {
      await pool.query(
        `
        UPDATE patients
        SET device_serial = $1
        WHERE id = $2
        `,
        [serial_number, patient_id]
      );
    }

    res.json({
      success: true,
      device: result.rows[0]
    });
  } catch (error) {
    console.error("CREATE DEVICE ERROR:", error);
    res.status(500).json({
      error: "Failed to create device"
    });
  }
});

// ==============================
// ASSIGN DEVICE TO PATIENT
// ==============================
router.put("/:id/assign", async (req, res) => {
  try {
    const deviceId = req.params.id;
    const { patient_id } = req.body;

    const deviceQ = await pool.query(
      `
      SELECT *
      FROM cpap_devices
      WHERE id = $1
      LIMIT 1
      `,
      [deviceId]
    );

    if (deviceQ.rows.length === 0) {
      return res.status(404).json({
        error: "Device not found"
      });
    }

    const serialNumber = deviceQ.rows[0].serial_number;

    await pool.query(
      `
      UPDATE cpap_devices
      SET patient_id = $1
      WHERE id = $2
      `,
      [patient_id, deviceId]
    );

    await pool.query(
      `
      UPDATE patients
      SET device_serial = $1
      WHERE id = $2
      `,
      [serialNumber, patient_id]
    );

    res.json({
      success: true,
      message: "Device assigned successfully"
    });
  } catch (error) {
    console.error("ASSIGN DEVICE ERROR:", error);
    res.status(500).json({
      error: "Failed to assign device"
    });
  }
});

module.exports = router;