const pool = require("../db");

// =====================================
// Helpers
// =====================================
function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  if (!arr.length) return 0;
  const m = mean(arr);
  const variance = mean(arr.map(x => Math.pow(x - m, 2)));
  return Math.sqrt(variance);
}

// simple linear regression slope
function slope(values) {
  if (!values.length) return 0;

  const n = values.length;
  const xs = values.map((_, i) => i + 1);
  const xMean = mean(xs);
  const yMean = mean(values);

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (xs[i] - xMean) * (values[i] - yMean);
    denominator += Math.pow(xs[i] - xMean, 2);
  }

  if (denominator === 0) return 0;
  return numerator / denominator;
}

// =====================================
// Core AI scoring
// =====================================
function scorePatient(dailyRows) {
  const hoursSeries = dailyRows.map(r => Number(r.hours_used || 0));
  const avg30 = mean(hoursSeries);
  const variability = stddev(hoursSeries);
  const trend = slope(hoursSeries); // positive = improving, negative = declining

  const disconnectDays = dailyRows.filter(r => Number(r.hours_used || 0) === 0).length;
  const activeDays = dailyRows.filter(r => Number(r.hours_used || 0) > 0).length;
  const adherenceRate = (activeDays / 30) * 100;

  // weighted scoring 0–100
  let score = 100;

  // low average usage is bad
  if (avg30 < 2) score -= 40;
  else if (avg30 < 4) score -= 25;
  else if (avg30 < 6) score -= 10;

  // variability is bad
  if (variability > 3) score -= 20;
  else if (variability > 2) score -= 10;

  // downward trend is bad
  if (trend < -0.15) score -= 20;
  else if (trend < -0.05) score -= 10;

  // many disconnect days is bad
  if (disconnectDays >= 10) score -= 25;
  else if (disconnectDays >= 5) score -= 15;
  else if (disconnectDays >= 3) score -= 8;

  // low adherence rate is bad
  if (adherenceRate < 40) score -= 20;
  else if (adherenceRate < 70) score -= 10;

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  let risk = "LOW";
  if (score < 40) risk = "HIGH";
  else if (score < 70) risk = "MEDIUM";

  return {
    adherence_score: Math.round(score),
    avg_30d_hours: Number(avg30.toFixed(2)),
    variability: Number(variability.toFixed(2)),
    disconnect_days: disconnectDays,
    adherence_rate: Number(adherenceRate.toFixed(1)),
    trend: Number(trend.toFixed(3)),
    risk
  };
}

// =====================================
// Fetch 30-day AI scoring for patients
// doctorId optional -> restrict to one doctor
// =====================================
async function predictComplianceRisk(doctorId = null) {
  const params = [];
  let doctorFilter = "";

  if (doctorId) {
    params.push(doctorId);
    doctorFilter = `WHERE p.doctor_id = $1`;
  }

  const patientsQ = await pool.query(
    `
    SELECT
      p.id,
      p.name,
      p.diagnosis,
      p.device_serial,
      p.doctor_id
    FROM patients p
    ${doctorFilter}
    ORDER BY p.id
    `,
    params
  );

  const predictions = [];

  for (const p of patientsQ.rows) {
    const usageQ = await pool.query(
      `
      WITH days AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '29 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS usage_date
      ),
      daily AS (
        SELECT
          d.usage_date,
          COALESCE(SUM(u.hours_used), 0) AS hours_used
        FROM days d
        LEFT JOIN usage_logs u
          ON u.patient_id = $1
         AND u.usage_date = d.usage_date
        GROUP BY d.usage_date
        ORDER BY d.usage_date
      )
      SELECT usage_date, hours_used
      FROM daily
      `,
      [p.id]
    );

    const metrics = scorePatient(usageQ.rows);

    predictions.push({
      patient_id: p.id,
      patient_name: p.name,
      diagnosis: p.diagnosis,
      device_serial: p.device_serial,
      ...metrics
    });
  }

  return predictions.sort((a, b) => a.adherence_score - b.adherence_score);
}

module.exports = {
  predictComplianceRisk
};