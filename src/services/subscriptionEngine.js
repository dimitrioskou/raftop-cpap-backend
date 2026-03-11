const pool = require("../db");

async function checkExpiredSubscriptions() {

  try {

    const expired = await pool.query(`
      SELECT doctor_id
      FROM subscriptions
      WHERE status = 'active'
      AND end_date < CURRENT_DATE
    `)

    for (const row of expired.rows) {

      const doctorId = row.doctor_id

      await pool.query(`
        UPDATE subscriptions
        SET status = 'expired'
        WHERE doctor_id = $1
        AND status = 'active'
      `,[doctorId])

      await pool.query(`
        UPDATE users
        SET account_status = 'suspended'
        WHERE id = $1
      `,[doctorId])

      console.log("Subscription expired for doctor:",doctorId)

    }

  } catch(err){

    console.error("Subscription engine error:",err)

  }

}

module.exports = {
  checkExpiredSubscriptions
}