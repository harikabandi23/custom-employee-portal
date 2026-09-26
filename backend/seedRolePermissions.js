require("dotenv").config();

const pool = require("./config/db");

async function seedRolePermissions() {
  try {
    console.log("Starting role-permission setup...");

    // Get roles
    const rolesResult = await pool.query(
      "SELECT id, name FROM roles"
    );

    // Get permissions
    const permissionsResult = await pool.query(
      "SELECT id, name FROM permissions"
    );

    const roles = rolesResult.rows;
    const permissions = permissionsResult.rows;

    console.log("Roles found:", roles);
    console.log("Permissions found:", permissions);

    // Helper functions
    const getRoleId = (roleName) => {
      const role = roles.find((r) => r.name === roleName);
      return role ? role.id : null;
    };

    const getPermissionId = (permissionName) => {
      const permission = permissions.find(
        (p) => p.name === permissionName
      );
      return permission ? permission.id : null;
    };

    // Role → Permissions mapping
    const rolePermissions = {
      Admin: [
        "zoho_people",
        "zoho_crm",
        "zoho_desk",
        "zoho_books",
        "manage_users",
        "manage_roles",
        "manage_permissions",
        "view_audit_logs"
      ],

      HR: [
        "zoho_people"
      ],

      Sales: [
        "zoho_crm"
      ],

      Support: [
        "zoho_desk"
      ],

      Finance: [
        "zoho_books"
      ]
    };

    // Insert relationships
    for (const [roleName, permissionNames] of Object.entries(
      rolePermissions
    )) {
      const roleId = getRoleId(roleName);

      if (!roleId) {
        console.log(`Role not found: ${roleName}`);
        continue;
      }

      for (const permissionName of permissionNames) {
        const permissionId = getPermissionId(permissionName);

        if (!permissionId) {
          console.log(
            `Permission not found: ${permissionName}`
          );
          continue;
        }

        await pool.query(
          `
          INSERT INTO role_permissions
            (role_id, permission_id)
          VALUES
            ($1, $2)
          ON CONFLICT DO NOTHING
          `,
          [roleId, permissionId]
        );
      }
    }

    console.log("");
    console.log("=================================");
    console.log("ROLE-PERMISSION SETUP COMPLETED!");
    console.log("=================================");

  } catch (error) {
    console.error(
      "Role-permission setup failed:",
      error
    );
  } finally {
    await pool.end();
  }
}

seedRolePermissions();