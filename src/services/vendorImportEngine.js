const pool = require("../db");
const { normalizeVendorRow } = require("./vendorNormalizer");
const { autoLinkDeviceToPatient } = require("./deviceLinkingEngine");

function complianceFromHours(hours) {
  if (hours >= 80) return "COMPLIANT";
  if (hours >= 40) return "WARNING";
  return "NON_COMPLIANT";
}

async function ensurePatient(client, normalized) {
  let patientId = null;

  if (normalized.external_patient_id) {
    const byExternal = await client.query(
      `
      SELECT id
      FROM patients
      WHERE email = $1
      LIMIT 1
      `,
      [`ext:${normalized.vendor}:${normalized.external_patient_id}`]
    );

    if (byExternal.rows.length > 0) {
      patientId = byExternal.rows[0].id;
    }
  }

  if (!patientId && normalized.patient_name) {
    const byName = await client.query(
      `
      SELECT id
      FROM patients
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1
      `,
      [normalized.patient_name]
    );

    if (byName.rows.length > 0) {
      patientId = byName.rows[0].id;
    }
  }

  if (!patientId) {
    const created = await client.query(
      `
      INSERT INTO patients
      (name, diagnosis, cpap_hours, compliance_status, device_serial, email)
      VALUES ($1, $2, 0, 'pending', $3, $4)
      RETURNING id
      `,
      [
        normalized.patient_name || `${normalized.vendor.toUpperCase()} Patient`,
        "OSA",
        normalized.device_serial,
        normalized.external_patient_id
          ? `ext:${normalized.vendor}:${normalized.external_patient_id}`
          : null
      ]
    );

    patientId = created.rows[0].id;
  }

  return patientId;
}

async function refreshPatientCompliance(client, patientId) {
  const q = await client.query(
    `
    SELECT COALESCE(SUM(hours_used),0) AS total_hours
    FROM usage_logs
    WHERE patient_id = $1
      AND DATE_TRUNC('month', usage_date) = DATE_TRUNC('month', CURRENT_DATE)
    `,
    [patientId]
  );

  const totalHours = Number(q.rows[0].total_hours || 0);
  const status = complianceFromHours(totalHours);

  await client.query(
    `
    UPDATE patients
    SET cpap_hours = $1,
        compliance_status = $2
    WHERE id = $3
    `,
    [totalHours, status, patientId]
  );
}

async function importVendorRows(vendor, rows) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let createdPatients = 0;
    let linkedDevices = 0;
    let importedRows = 0;

    for (const row of rows) {
      const normalized = normalizeVendorRow(vendor, row);

      const existingPatientCountQ = await client.query(`SELECT COUNT(*)::int AS c FROM patients`);
      const beforePatients = existingPatientCountQ.rows[0].c;

      const patientId = await ensurePatient(client, normalized);

      const afterPatientCountQ = await client.query(`SELECT COUNT(*)::int AS c FROM patients`);
      const afterPatients = afterPatientCountQ.rows[0].c;

      if (afterPatients > beforePatients) {
        createdPatients++;
      }

      const linkResult = await autoLinkDeviceToPatient({
        patientId,
        patientName: normalized.patient_name,
        deviceSerial: normalized.device_serial,
        brand: normalized.brand,
        model: normalized.model
      });

      if (linkResult.success) {
        linkedDevices++;
      }

      await client.query(
        `
        INSERT INTO usage_logs
        (
          patient_id,
          usage_date,
          hours_used,
          ahi,
          mask_leak,
          pressure,
          source,
          device_serial,
          vendor,
          external_patient_id,
          raw_payload
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `,
        [
          patientId,
          normalized.usage_date,
          normalized.hours_used,
          normalized.ahi,
          normalized.mask_leak,
          normalized.pressure,
          `${normalized.vendor}_import`,
          normalized.device_serial,
          normalized.vendor,
          normalized.external_patient_id,
          normalized.raw_payload
        ]
      );

      await refreshPatientCompliance(client, patientId);

      importedRows++;
    }

    await client.query("COMMIT");

    return {
      success: true,
      vendor,
      imported_rows: importedRows,
      created_patients: createdPatients,
      linked_devices: linkedDevices
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("VENDOR IMPORT ENGINE ERROR:", error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
}

module.exports = {
  importVendorRows
};