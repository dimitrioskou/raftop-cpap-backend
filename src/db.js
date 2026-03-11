const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "1234", // άλλαξέ το αν έχεις άλλο password
  database: "cpap_care", // βάλε το πραγματικό όνομα της DB σου
  ssl: false
});

// Test σύνδεσης (για να δούμε αν κολλάει εδώ)
pool.connect()
  .then(() => {
    console.log("✅ PostgreSQL Connected Successfully");
  })
  .catch((err) => {
    console.error("❌ PostgreSQL Connection Error:", err.message);
  });

module.exports = pool;