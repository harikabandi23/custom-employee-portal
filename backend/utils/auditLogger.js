const pool = require("../config/db");

async function createAuditLog({ userId, action, details = null }) {
  try {
    await pool.query(
      `
      INSERT INTO audit_logs
        (user_id, action, details)
      VALUES
        ($1, $2, $3)
      `,
      [userId, action, details]
    );

    console.log("Audit log created:", action);

    return true;
  } catch (error) {
    console.error("Audit log error:", error);

    return false;
  }
}

module.exports = createAuditLog;