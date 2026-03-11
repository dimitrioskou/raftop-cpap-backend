const pool = require("../db");

function getSeverity(totalHours) {
  // στόχος: 80 ώρες / 30 ημέρες
  if (totalHours >= 80) return { status: "compliant", severity: null };
  if (totalHours >= 60) return { status: "warning", severity: "warning" };
  return { status: "critical", severity: "critical" };
}

async function compute30DayHours(patientId) {
  const result = await pool.query(
    `
    SELECT COALESCE(SUM(hours_used), 0) AS total
    FROM usage_logs
    WHERE patient_id = $1
      AND usage_date >= (CURRENT_DATE - INTERVAL '30 days')
    `,
    [patientId]
  );

  const total = Number(result.rows[0].total || 0);
  const { status, severity } = getSeverity(total);

  return { totalHours30d: total, status, severity };
}

async function upsertPatientCompliance(patientId) {
  const { totalHours30d, status, severity } = await compute30DayHours(patientId);

  // ενημερώνουμε patients.cpap_hours + compliance_status (γρήγορο dashboard)
  await pool.query(
    `
    UPDATE patients
    SET cpap_hours = $1,
        compliance_status = $2
    WHERE id = $3
    `,
    [Math.round(totalHours30d), status, patientId]
  );

  // αν είναι warning/critical, γράφουμε alert (αποφεύγουμε spam ίδιας μέρας)
  if (status !== "compliant") {
    const existing = await pool.query(
      `
      SELECT id FROM alerts
      WHERE patient_id = $1
        AND alert_type = 'non_compliance'
        AND resolved = FALSE
        AND created_at::date = CURRENT_DATE
      LIMIT 1
      `,
      [patientId]
    );

    if (existing.rows.length === 0) {
      const msg =
        status === "warning"
          ? `Προειδοποίηση: ${totalHours30d.toFixed(
              1
            )} ώρες τις τελευταίες 30 ημέρες (στόχος 80).`
          : `ΚΡΙΣΙΜΟ: ${totalHours30d.toFixed(
              1
            )} ώρες τις τελευταίες 30 ημέρες (στόχος 80).`;

      await pool.query(
        `
        INSERT INTO alerts (patient_id, alert_type, severity, message)
        VALUES ($1, 'non_compliance', $2, $3)
        `,
        [patientId, severity, msg]
      );
    }
  }

  return { totalHours30d, status, severity };
}

module.exports = {
  compute30DayHours,
  upsertPatientCompliance,
};
