const express = require("express");
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const authenticateToken = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");
const createAuditLog = require("../utils/auditLogger");

const router = express.Router();


// =====================================================
// GET ALL USERS
// GET /api/admin/users
// =====================================================

router.get(
  "/users",
  authenticateToken,
  requirePermission("manage_users"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
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
        ORDER BY u.id ASC
        `
      );

      res.json({
        success: true,
        message: "Users retrieved successfully",
        users: result.rows
      });
    } catch (error) {
      console.error("Get users error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to retrieve users"
      });
    }
  }
);


// =====================================================
// CREATE USER
// POST /api/admin/users
// =====================================================

router.post(
  "/users",
  authenticateToken,
  requirePermission("manage_users"),
  async (req, res) => {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password || !role) {
        return res.status(400).json({
          success: false,
          message: "Name, email, password and role are required"
        });
      }

      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "User with this email already exists"
        });
      }

      const roleResult = await pool.query(
        "SELECT id FROM roles WHERE name = $1",
        [role]
      );

      if (roleResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid role"
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const userResult = await pool.query(
        `
        INSERT INTO users
          (name, email, password_hash)
        VALUES
          ($1, $2, $3)
        RETURNING
          id,
          name,
          email,
          is_active
        `,
        [name, email, passwordHash]
      );

      const user = userResult.rows[0];

      await pool.query(
        `
        INSERT INTO user_roles
          (user_id, role_id)
        VALUES
          ($1, $2)
        `,
        [user.id, roleResult.rows[0].id]
      );

      await createAuditLog({
        userId: req.user.userId,
        action: "CREATE_USER",
        details: `Created user ${user.email} with role ${role}`
      });

      res.status(201).json({
        success: true,
        message: "User created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: role,
          is_active: user.is_active
        }
      });
    } catch (error) {
      console.error("Create user error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to create user"
      });
    }
  }
);


// =====================================================
// UPDATE USER STATUS
// PATCH /api/admin/users/:id/status
// =====================================================

router.patch(
  "/users/:id/status",
  authenticateToken,
  requirePermission("manage_users"),
  async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { is_active } = req.body;

      if (!Number.isInteger(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID"
        });
      }

      if (typeof is_active !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "is_active must be true or false"
        });
      }

      const result = await pool.query(
        `
        UPDATE users
        SET is_active = $1
        WHERE id = $2
        RETURNING
          id,
          name,
          email,
          is_active
        `,
        [is_active, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      await createAuditLog({
        userId: req.user.userId,
        action: "UPDATE_USER_STATUS",
        details: `Changed user ${result.rows[0].email} active status to ${is_active}`
      });

      res.json({
        success: true,
        message: "User status updated successfully",
        user: result.rows[0]
      });
    } catch (error) {
      console.error("Update user status error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update user status"
      });
    }
  }
);


// =====================================================
// GET ALL ROLES
// GET /api/admin/roles
// =====================================================

router.get(
  "/roles",
  authenticateToken,
  requirePermission("manage_roles"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          id,
          name
        FROM roles
        ORDER BY id ASC
        `
      );

      res.json({
        success: true,
        message: "Roles retrieved successfully",
        roles: result.rows
      });
    } catch (error) {
      console.error("Get roles error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to retrieve roles"
      });
    }
  }
);


// =====================================================
// CREATE ROLE
// POST /api/admin/roles
// =====================================================

router.post(
  "/roles",
  authenticateToken,
  requirePermission("manage_roles"),
  async (req, res) => {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Role name is required"
        });
      }

      const existingRole = await pool.query(
        "SELECT id FROM roles WHERE name = $1",
        [name]
      );

      if (existingRole.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Role already exists"
        });
      }

      const result = await pool.query(
        `
        INSERT INTO roles (name)
        VALUES ($1)
        RETURNING
          id,
          name
        `,
        [name]
      );

      await createAuditLog({
        userId: req.user.userId,
        action: "CREATE_ROLE",
        details: `Created role ${result.rows[0].name}`
      });

      res.status(201).json({
        success: true,
        message: "Role created successfully",
        role: result.rows[0]
      });
    } catch (error) {
      console.error("Create role error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to create role"
      });
    }
  }
);


// =====================================================
// GET ALL PERMISSIONS
// GET /api/admin/permissions
// =====================================================

router.get(
  "/permissions",
  authenticateToken,
  requirePermission("manage_permissions"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          id,
          name
        FROM permissions
        ORDER BY id ASC
        `
      );

      res.json({
        success: true,
        message: "Permissions retrieved successfully",
        permissions: result.rows
      });
    } catch (error) {
      console.error("Get permissions error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to retrieve permissions"
      });
    }
  }
);


// =====================================================
// CREATE PERMISSION
// POST /api/admin/permissions
// =====================================================

router.post(
  "/permissions",
  authenticateToken,
  requirePermission("manage_permissions"),
  async (req, res) => {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Permission name is required"
        });
      }

      const existingPermission = await pool.query(
        "SELECT id FROM permissions WHERE name = $1",
        [name]
      );

      if (existingPermission.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Permission already exists"
        });
      }

      const result = await pool.query(
        `
        INSERT INTO permissions (name)
        VALUES ($1)
        RETURNING
          id,
          name
        `,
        [name]
      );

      await createAuditLog({
        userId: req.user.userId,
        action: "CREATE_PERMISSION",
        details: `Created permission ${result.rows[0].name}`
      });

      res.status(201).json({
        success: true,
        message: "Permission created successfully",
        permission: result.rows[0]
      });
    } catch (error) {
      console.error("Create permission error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to create permission"
      });
    }
  }
);


// =====================================================
// GET PERMISSIONS FOR A ROLE
// GET /api/admin/roles/:roleId/permissions
// =====================================================

router.get(
  "/roles/:roleId/permissions",
  authenticateToken,
  requirePermission("manage_roles"),
  async (req, res) => {
    try {
      const roleId = Number(req.params.roleId);

      if (!Number.isInteger(roleId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role ID"
        });
      }

      const roleResult = await pool.query(
        `
        SELECT
          id,
          name
        FROM roles
        WHERE id = $1
        `,
        [roleId]
      );

      if (roleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Role not found"
        });
      }

      const permissionsResult = await pool.query(
        `
        SELECT
          p.id,
          p.name
        FROM permissions p
        JOIN role_permissions rp
          ON p.id = rp.permission_id
        WHERE rp.role_id = $1
        ORDER BY p.id ASC
        `,
        [roleId]
      );

      res.json({
        success: true,
        message: "Role permissions retrieved successfully",
        role: roleResult.rows[0],
        permissions: permissionsResult.rows
      });
    } catch (error) {
      console.error("Get role permissions error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to retrieve role permissions"
      });
    }
  }
);


// =====================================================
// ASSIGN PERMISSION TO ROLE
// POST /api/admin/roles/:roleId/permissions
// =====================================================

router.post(
  "/roles/:roleId/permissions",
  authenticateToken,
  requirePermission("manage_roles"),
  async (req, res) => {
    try {
      const roleId = Number(req.params.roleId);
      const permissionId = Number(req.body.permissionId);

      if (!Number.isInteger(roleId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role ID"
        });
      }

      if (!Number.isInteger(permissionId)) {
        return res.status(400).json({
          success: false,
          message: "Valid permissionId is required"
        });
      }

      const roleResult = await pool.query(
        `
        SELECT
          id,
          name
        FROM roles
        WHERE id = $1
        `,
        [roleId]
      );

      if (roleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Role not found"
        });
      }

      const permissionResult = await pool.query(
        `
        SELECT
          id,
          name
        FROM permissions
        WHERE id = $1
        `,
        [permissionId]
      );

      if (permissionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Permission not found"
        });
      }

      const existingMapping = await pool.query(
        `
        SELECT
          role_id,
          permission_id
        FROM role_permissions
        WHERE role_id = $1
          AND permission_id = $2
        `,
        [roleId, permissionId]
      );

      if (existingMapping.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Permission is already assigned to this role"
        });
      }

      await pool.query(
        `
        INSERT INTO role_permissions
          (role_id, permission_id)
        VALUES
          ($1, $2)
        `,
        [roleId, permissionId]
      );

      await createAuditLog({
        userId: req.user.userId,
        action: "ASSIGN_PERMISSION",
        details: `Assigned permission ${permissionResult.rows[0].name} to role ${roleResult.rows[0].name}`
      });

      res.status(201).json({
        success: true,
        message: "Permission assigned to role successfully",
        role: roleResult.rows[0],
        permission: permissionResult.rows[0]
      });
    } catch (error) {
      console.error("Assign permission error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to assign permission to role"
      });
    }
  }
);


// =====================================================
// GET AUDIT LOGS
// GET /api/admin/audit-logs
// =====================================================

router.get(
  "/audit-logs",
  authenticateToken,
  requirePermission("view_audit_logs"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          al.id,
          al.action,
          al.details,
          al.created_at,
          u.id AS user_id,
          u.name AS user_name,
          u.email AS user_email
        FROM audit_logs al
        JOIN users u
          ON al.user_id = u.id
        ORDER BY al.id DESC
        `
      );

      res.json({
        success: true,
        message: "Audit logs retrieved successfully",
        auditLogs: result.rows
      });
    } catch (error) {
      console.error("Get audit logs error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to retrieve audit logs"
      });
    }
  }
);
router.get(
  "/check-hr-permission",
  authenticateToken,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          r.name AS role,
          p.name AS permission
        FROM roles r
        JOIN role_permissions rp
          ON r.id = rp.role_id
        JOIN permissions p
          ON rp.permission_id = p.id
        WHERE r.name = 'HR'
        ORDER BY p.id
      `);

      res.json({
        success: true,
        results: result.rows
      });
    } catch (error) {
      console.error("Permission check error:", error);

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

module.exports = router;