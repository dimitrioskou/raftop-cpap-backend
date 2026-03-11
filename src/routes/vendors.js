const express = require("express");
const router = express.Router();
const { importVendorRows } = require("../services/vendorImportEngine");

// =====================================
// UNIFIED VENDOR IMPORT
// body:
// {
//   "vendor": "resmed",
//   "rows": [ ... ]
// }
// =====================================
router.post("/import", async (req, res) => {
  try {
    const { vendor, rows } = req.body;

    if (!vendor || !Array.isArray(rows)) {
      return res.status(400).json({
        error: "vendor και rows απαιτούνται"
      });
    }

    const result = await importVendorRows(vendor, rows);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("UNIFIED VENDOR IMPORT ERROR:", error);
    res.status(500).json({
      error: "Vendor import failed"
    });
  }
});

// =====================================
// DEMO TEST IMPORT FOR EACH VENDOR
// =====================================
router.get("/demo/:vendor", async (req, res) => {
  try {
    const vendor = req.params.vendor.toLowerCase();

    const demoRows = {
      resmed: [
        {
          patient_name: "ResMed Demo Patient",
          patient_id: "RM001",
          device_serial: "RM-SERIAL-1001",
          usage_date: "2026-03-08",
          hours_used: 6.5,
          ahi: 2.1,
          mask_leak: 8.4,
          pressure: 9.2,
          model: "AirSense 11"
        }
      ],
      philips: [
        {
          patient_name: "Philips Demo Patient",
          patient_id: "PH001",
          device_id: "PH-SERIAL-2001",
          usage_date: "2026-03-08",
          therapy_hours: 5.8,
          residual_ahi: 3.6,
          large_leak: 12.2,
          mean_pressure: 8.4,
          model: "DreamStation"
        }
      ],
      lowenstein: [
        {
          patient_name: "Lowenstein Demo Patient",
          device_serial: "LW-SERIAL-3001",
          usage_date: "2026-03-08",
          hours_used: 7.1,
          ahi: 1.8,
          leak: 6.5,
          pressure: 10.0,
          model: "prisma"
        }
      ],
      cefam: [
        {
          patient_name: "Cefam Demo Patient",
          device_serial: "CF-SERIAL-4001",
          usage_date: "2026-03-08",
          hours_used: 4.9,
          ahi: 6.3,
          leak: 15.9,
          pressure: 8.0,
          model: "Cefam Device"
        }
      ]
    };

    if (!demoRows[vendor]) {
      return res.status(400).json({
        error: "Unsupported demo vendor"
      });
    }

    const result = await importVendorRows(vendor, demoRows[vendor]);
    res.json(result);
  } catch (error) {
    console.error("DEMO VENDOR IMPORT ERROR:", error);
    res.status(500).json({
      error: "Demo import failed"
    });
  }
});

module.exports = router;