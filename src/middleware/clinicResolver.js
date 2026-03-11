const pool = require("../db");

async function clinicResolver(req, res, next) {

  const host = req.headers.host;

  const subdomain = host.split(".")[0];

  try {

    const result = await pool.query(
      "SELECT * FROM users WHERE subdomain = $1 LIMIT 1",
      [subdomain]
    );

    if (result.rows.length > 0) {

      req.clinic = result.rows[0];

    }

  } catch (err) {

    console.error("Clinic resolver error", err);

  }

  next();
}

module.exports = clinicResolver;