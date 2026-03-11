const pool = require("../db");

async function autoLinkDeviceToPatient({
  patientId,
  patientName,
  deviceSerial,
  brand = "ResMed",
  model = "Unknown",
  pressureMin = null,
  pressureMax = null
}) {
  try {
    if (!deviceSerial) {
      return {
        success: false,
        message: "No device serial provided"
      };
    }

    let targetPatientId = patientId || null;

    // 1) Αν δεν έχουμε patientId, ψάξε με όνομα
    if (!targetPatientId && patientName) {
      const patientQ = await pool.query(
        `
        SELECT id
        FROM patients
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1
        `,
        [patientName]
      );

      if (patientQ.rows.length > 0) {
        targetPatientId = patientQ.rows[0].id;
      }
    }

    if (!targetPatientId) {
      return {
        success: false,
        message: "Patient not found for device linking"
      };
    }

    // 2) Έλεγξε αν υπάρχει ήδη η συσκευή
    const existingDeviceQ = await pool.query(
      `
      SELECT *
      FROM cpap_devices
      WHERE serial_number = $1
      LIMIT 1
      `,
      [deviceSerial]
    );

    if (existingDeviceQ.rows.length === 0) {
      // 3) Δημιούργησε νέα συσκευή
      await pool.query(
        `
        INSERT INTO cpap_devices
        (
          serial_number,
          brand,
          model,
          pressure_min,
          pressure_max,
          patient_id,
          status
        )
        VALUES ($1,$2,$3,$4,$5,$6,'active')
        `,
        [
          deviceSerial,
          brand,
          model,
          pressureMin,
          pressureMax,
          targetPatientId
        ]
      );
    } else {
      // 4) Αν υπάρχει, σύνδεσέ τη με τον ασθενή
      await pool.query(
        `
        UPDATE cpap_devices
        SET patient_id = $1,
            brand = COALESCE($2, brand),
            model = COALESCE($3, model),
            pressure_min = COALESCE($4, pressure_min),
            pressure_max = COALESCE($5, pressure_max),
            status = 'active'
        WHERE serial_number = $6
        `,
        [
          targetPatientId,
          brand,
          model,
          pressureMin,
          pressureMax,
          deviceSerial
        ]
      );
    }

    // 5) Ενημέρωσε τον ασθενή
    await pool.query(
      `
      UPDATE patients
      SET device_serial = $1
      WHERE id = $2
      `,
      [deviceSerial, targetPatientId]
    );

    return {
      success: true,
      message: "Device linked successfully",
      patient_id: targetPatientId,
      device_serial: deviceSerial
    };
  } catch (error) {
    console.error("AUTO DEVICE LINK ERROR:", error);
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  autoLinkDeviceToPatient
};