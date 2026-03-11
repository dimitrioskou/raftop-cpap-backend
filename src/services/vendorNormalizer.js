function safeNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const v = parseFloat(String(value).replace(",", "."));
  return Number.isNaN(v) ? 0 : v;
}

function toIsoDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split("/");
    return `${y}-${m}-${d}`;
  }

  const dt = new Date(raw);
  if (!Number.isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

function normalizeResMed(row) {
  return {
    vendor: "resmed",
    patient_name: row.patient_name || row.name || row.patient || null,
    external_patient_id: row.external_patient_id || row.patient_id || null,
    device_serial: row.device_serial || row.serial_number || row.serial || null,
    external_device_id: row.external_device_id || null,
    usage_date: toIsoDate(row.usage_date || row.date || row.day),
    hours_used: safeNumber(row.hours_used || row.hours || row.usage_hours),
    ahi: safeNumber(row.ahi),
    mask_leak: safeNumber(row.mask_leak || row.leak || row.leak_rate),
    pressure: safeNumber(row.pressure || row.avg_pressure),
    brand: "ResMed",
    model: row.model || "Unknown",
    raw_payload: row
  };
}

function normalizePhilips(row) {
  return {
    vendor: "philips",
    patient_name: row.patient_name || row.name || row.patient || null,
    external_patient_id: row.external_patient_id || row.patient_id || null,
    device_serial: row.device_serial || row.device_id || row.serial || null,
    external_device_id: row.external_device_id || row.device_id || null,
    usage_date: toIsoDate(row.usage_date || row.date),
    hours_used: safeNumber(row.hours_used || row.therapy_hours || row.hours),
    ahi: safeNumber(row.ahi || row.residual_ahi),
    mask_leak: safeNumber(row.mask_leak || row.large_leak || row.leak),
    pressure: safeNumber(row.pressure || row.mean_pressure),
    brand: "Philips",
    model: row.model || "DreamStation",
    raw_payload: row
  };
}

function normalizeLowenstein(row) {
  return {
    vendor: "lowenstein",
    patient_name: row.patient_name || row.name || null,
    external_patient_id: row.external_patient_id || null,
    device_serial: row.device_serial || row.serial || null,
    external_device_id: row.external_device_id || null,
    usage_date: toIsoDate(row.usage_date || row.date),
    hours_used: safeNumber(row.hours_used || row.hours),
    ahi: safeNumber(row.ahi),
    mask_leak: safeNumber(row.mask_leak || row.leak),
    pressure: safeNumber(row.pressure),
    brand: "Lowenstein",
    model: row.model || "prisma",
    raw_payload: row
  };
}

function normalizeCefam(row) {
  return {
    vendor: "cefam",
    patient_name: row.patient_name || row.name || null,
    external_patient_id: row.external_patient_id || null,
    device_serial: row.device_serial || row.serial || null,
    external_device_id: row.external_device_id || null,
    usage_date: toIsoDate(row.usage_date || row.date),
    hours_used: safeNumber(row.hours_used || row.hours),
    ahi: safeNumber(row.ahi),
    mask_leak: safeNumber(row.mask_leak || row.leak),
    pressure: safeNumber(row.pressure),
    brand: "Cefam",
    model: row.model || "Unknown",
    raw_payload: row
  };
}

function normalizeVendorRow(vendor, row) {
  const v = String(vendor || "").toLowerCase();

  if (v === "resmed") return normalizeResMed(row);
  if (v === "philips") return normalizePhilips(row);
  if (v === "lowenstein") return normalizeLowenstein(row);
  if (v === "cefam") return normalizeCefam(row);

  throw new Error(`Unsupported vendor: ${vendor}`);
}

module.exports = {
  normalizeVendorRow
};