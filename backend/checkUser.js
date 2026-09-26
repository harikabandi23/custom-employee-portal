require("dotenv").config();

const pool = require("./config/db");

async function checkUser() {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.is_active,
        r.name AS role
      FROM users u
      JOIN user_roles ur
        ON u.id = ur.user_id
      JOIN roles r
        ON ur.role_id = r.id
      WHERE u.email = 'harika@test.com';
    `);

    console.log("User found:");
    console.log(result.rows);
  } catch (error) {
    console.error("Database verification error:", error);
  } finally {
    await pool.end();
  }
}

checkUser();