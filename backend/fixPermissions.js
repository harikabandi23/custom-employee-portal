require("dotenv").config();

const pool = require("./config/db");

async function fixPermissions() {
  try {
    console.log("=================================");
    console.log("FIXING HR PERMISSIONS");
    console.log("=================================");

    // --------------------------------------------------
    // 1. Make sure required permissions exist
    // --------------------------------------------------

    const permissions = [
      "manage_users",
      "manage_roles",
      "manage_permissions",
      "view_audit_logs",
    ];

    for (const permissionName of permissions) {
      await pool.query(
        `
        INSERT INTO permissions (name)
        VALUES ($1)
        ON CONFLICT (name) DO NOTHING
        `,
        [permissionName]
      );

      console.log(`Permission ready: ${permissionName}`);
    }

    // --------------------------------------------------
    // 2. Find HR role
    // --------------------------------------------------

    const roleResult = await pool.query(
      `
      SELECT id, name
      FROM roles
      WHERE LOWER(name) = LOWER('HR')
      LIMIT 1
      `
    );

    if (roleResult.rows.length === 0) {
      throw new Error(
        "HR role was not found in the roles table."
      );
    }

    const role = roleResult.rows[0];

    console.log("");
    console.log("Role found:");
    console.log(role);

    // --------------------------------------------------
    // 3. Assign administration permissions to HR
    // --------------------------------------------------

    for (const permissionName of permissions) {
      await pool.query(
        `
        INSERT INTO role_permissions
          (role_id, permission_id)
        SELECT
          $1,
          p.id
        FROM permissions p
        WHERE p.name = $2
        ON CONFLICT (role_id, permission_id) DO NOTHING
        `,
        [role.id, permissionName]
      );

      console.log(
        `Assigned "${permissionName}" to "${role.name}"`
      );
    }

    // --------------------------------------------------
    // 4. Show final HR permissions
    // --------------------------------------------------

    const finalResult = await pool.query(
      `
      SELECT
        r.id AS role_id,
        r.name AS role_name,
        p.id AS permission_id,
        p.name AS permission_name
      FROM roles r
      JOIN role_permissions rp
        ON r.id = rp.role_id
      JOIN permissions p
        ON p.id = rp.permission_id
      WHERE r.id = $1
      ORDER BY p.id
      `,
      [role.id]
    );

    console.log("");
    console.log("=================================");
    console.log("HR PERMISSIONS");
    console.log("=================================");

    console.table(finalResult.rows);

    console.log("");
    console.log("=================================");
    console.log("PERMISSIONS FIXED SUCCESSFULLY");
    console.log("=================================");

  } catch (error) {
    console.error("");
    console.error("=================================");
    console.error("PERMISSION FIX ERROR");
    console.error("=================================");
    console.error(error);
  } finally {
    await pool.end();
  }
}

fixPermissions();