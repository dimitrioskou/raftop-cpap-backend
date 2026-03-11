const axios = require("axios");
const pool = require("../db");
const { autoLinkDeviceToPatient } = require("./deviceLinkingEngine");

async function syncAirView() {
  try {
    console.log("Starting AirView Sync");

    // DEMO source - αντικατέστησέ το αργότερα με πραγματικό AirView/API source
    const res = await axios.get("https://jsonplaceholder.typicode.com/users");
    const sourcePatients = res.data || [];

    for (const p of sourcePatients) {
      const patientName = p.name;
      const deviceSerial = `AUTO-${p.id}-RESMED`;
      const hoursUsed = Number((Math.random() * 8).toFixed(1));
      const ahi = Number((Math.random() * 6).toFixed(1));
      const maskLeak = Number((Math.random() * 20).toFixed(1));

      // 1) check/create patient
      let patientId = null;

      const existingPatientQ = await pool.query(
        `
        SELECT id
        FROM patients
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1
        `,
        [patientName]
      );

      if (existingPatientQ.rows.length === 0) {
        const createdPatientQ = await pool.query(
          `
          INSERT INTO patients
          (name, diagnosis, cpap_hours, compliance_status, device_serial)
          VALUES ($1, $2, 0, 'pending', $3)
          RETURNING id
          `,
          [patientName, "OSA", deviceSerial]
        );

        patientId = createdPatientQ.rows[0].id;
        console.log("Created new patient:", patientName);
      } else {
        patientId = existingPatientQ.rows[0].id;
      }

      // 2) auto link device
      await autoLinkDeviceToPatient({
        patientId,
        patientName,
        deviceSerial,
        brand: "ResMed",
        model: "AirSense AutoSet"
      });

      // 3) insert usage
      await pool.query(
        `
        INSERT INTO usage_logs
        (patient_id, usage_date, hours_used, ahi, mask_leak, source, device_serial)
        VALUES ($1, CURRENT_DATE, $2, $3, $4, 'airview_sync', $5)
        `,
        [patientId, hoursUsed, ahi, maskLeak, deviceSerial]
      );

      // 4) update patient hours/status (simple version)
      const monthlyQ = await pool.query(
        `
        SELECT COALESCE(SUM(hours_used),0) AS total_hours
        FROM usage_logs
        WHERE patient_id = $1
          AND DATE_TRUNC('month', usage_date) = DATE_TRUNC('month', CURRENT_DATE)
        `,
        [patientId]
      );

      const totalHours = Number(monthlyQ.rows[0].total_hours || 0);

      let complianceStatus = "NON_COMPLIANT";
      if (totalHours >= 80) complianceStatus = "COMPLIANT";
      else if (totalHours >= 40) complianceStatus = "WARNING";

      await pool.query(
        `
        UPDATE patients
        SET cpap_hours = $1,
            compliance_status = $2
        WHERE id = $3
        `,
        [totalHours, complianceStatus, patientId]
      );
    }

    console.log("AirView Sync Completed");
  } catch (err) {
    console.error("AirView Sync Error:", err);
  }
}

module.exports = {
  syncAirView
};