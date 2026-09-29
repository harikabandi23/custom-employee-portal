const express = require("express");
const pool = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// RBAC ROUTES FILE
// =====================================================

console.log("========== RBAC ROUTES FILE LOADED ==========");
console.log("File:", __filename);

// =====================================================
// BASIC RBAC TEST
// GET /api/rbac/test
// =====================================================

router.get("/test", authenticateToken, async (req, res) => {
  return res.json({
    success: true,
    message: "RBAC routes are working.",
    user: req.user || null,
  });
});

// =====================================================
// GET MY ROLE AND PERMISSIONS
// GET /api/rbac/my-permissions
// =====================================================

router.get(
  "/my-permissions",
  authenticateToken,
  async (req, res) => {
    console.log("=================================");
    console.log("RBAC: /my-permissions called");
    console.log("Authenticated user:", req.user);
    console.log("=================================");

    try {
      // -------------------------------------------------
      // GET USER ID FROM JWT
      // -------------------------------------------------

      const userId =
        req.user?.userId ||
        req.user?.id ||
        req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is missing from authentication token.",
        });
      }

      // -------------------------------------------------
      // GET USER ROLE
      // -------------------------------------------------

      const roleResult = await pool.query(
        `
        SELECT
          r.id,
          r.name
        FROM user_roles ur
        INNER JOIN roles r
          ON ur.role_id = r.id
        WHERE ur.user_id = $1
        ORDER BY r.id ASC
        LIMIT 1
        `,
        [userId]
      );

      if (roleResult.rows.length === 0) {
        return res.json({
          success: true,
          message: "User has no role assigned.",
          role: "Employee",
          roleId: null,
          permissions: [],
        });
      }

      const role = roleResult.rows[0];

      console.log("RBAC ROLE:", role);

      // -------------------------------------------------
      // GET ROLE PERMISSIONS
      // -------------------------------------------------

      const permissionsResult = await pool.query(
        `
        SELECT
          p.id,
          p.name
        FROM role_permissions rp
        INNER JOIN permissions p
          ON rp.permission_id = p.id
        WHERE rp.role_id = $1
        ORDER BY p.id ASC
        `,
        [role.id]
      );

      console.log(
        "RBAC PERMISSIONS:",
        permissionsResult.rows
      );

      // -------------------------------------------------
      // RETURN ROLE + PERMISSIONS
      // -------------------------------------------------

      return res.status(200).json({
        success: true,
        message:
          "User permissions retrieved successfully.",
        role: role.name,
        roleId: role.id,
        permissions: permissionsResult.rows,
      });
    } catch (error) {
      console.error("=================================");
      console.error("RBAC MY PERMISSIONS ERROR");
      console.error("Message:", error.message);
      console.error("Code:", error.code);
      console.error("Detail:", error.detail);
      console.error("Hint:", error.hint);
      console.error("=================================");

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve user permissions.",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET MY ROLE
// GET /api/rbac/my-role
// =====================================================

router.get(
  "/my-role",
  authenticateToken,
  async (req, res) => {
    try {
      const userId =
        req.user?.userId ||
        req.user?.id ||
        req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is missing from authentication token.",
        });
      }

      const result = await pool.query(
        `
        SELECT
          r.id,
          r.name,
          r.description
        FROM user_roles ur
        INNER JOIN roles r
          ON ur.role_id = r.id
        WHERE ur.user_id = $1
        ORDER BY r.id ASC
        LIMIT 1
        `,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          role: null,
          message:
            "No role assigned to this user.",
        });
      }

      return res.json({
        success: true,
        role: result.rows[0],
      });
    } catch (error) {
      console.error("Get my role error:", error);

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve user role.",
      });
    }
  }
);

// =====================================================
// GET MY PROFILE
// GET /api/rbac/my-profile
// =====================================================

router.get(
  "/my-profile",
  authenticateToken,
  async (req, res) => {
    try {
      const userId =
        req.user?.userId ||
        req.user?.id ||
        req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is missing from authentication token.",
        });
      }

      const result = await pool.query(
        `
        SELECT
          u.id,
          u.name,
          u.email,
          u.is_active,
          r.id AS role_id,
          r.name AS role
        FROM users u
        LEFT JOIN user_roles ur
          ON u.id = ur.user_id
        LEFT JOIN roles r
          ON ur.role_id = r.id
        WHERE u.id = $1
        LIMIT 1
        `,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      return res.json({
        success: true,
        user: result.rows[0],
      });
    } catch (error) {
      console.error(
        "Get my profile error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve user profile.",
      });
    }
  }
);

// =====================================================
// ZOHO PEOPLE ACCESS TEST
// GET /api/rbac/people-test
// =====================================================

router.get(
  "/people-test",
  authenticateToken,
  async (req, res) => {
    try {
      const userId =
        req.user?.userId ||
        req.user?.id ||
        req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is missing from authentication token.",
        });
      }

      const result = await pool.query(
        `
        SELECT p.id, p.name
        FROM permissions p
        INNER JOIN role_permissions rp
          ON p.id = rp.permission_id
        INNER JOIN user_roles ur
          ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1
          AND p.name = 'zoho_people'
        LIMIT 1
        `,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied to Zoho People.",
        });
      }

      return res.json({
        success: true,
        message:
          "Access granted to Zoho People.",
      });
    } catch (error) {
      console.error(
        "Zoho People RBAC error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to verify Zoho People access.",
      });
    }
  }
);

// =====================================================
// ZOHO CRM ACCESS TEST
// GET /api/rbac/crm-test
// =====================================================

router.get(
  "/crm-test",
  authenticateToken,
  async (req, res) => {
    try {
      const userId =
        req.user?.userId ||
        req.user?.id ||
        req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is missing from authentication token.",
        });
      }

      const result = await pool.query(
        `
        SELECT p.id, p.name
        FROM permissions p
        INNER JOIN role_permissions rp
          ON p.id = rp.permission_id
        INNER JOIN user_roles ur
          ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1
          AND p.name = 'zoho_crm'
        LIMIT 1
        `,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied to Zoho CRM.",
        });
      }

      return res.json({
        success: true,
        message:
          "Access granted to Zoho CRM.",
      });
    } catch (error) {
      console.error(
        "Zoho CRM RBAC error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to verify Zoho CRM access.",
      });
    }
  }
);

// =====================================================
// ZOHO DESK ACCESS TEST
// GET /api/rbac/desk-test
// =====================================================

router.get(
  "/desk-test",
  authenticateToken,
  async (req, res) => {
    try {
      const userId =
        req.user?.userId ||
        req.user?.id ||
        req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is missing from authentication token.",
        });
      }

      const result = await pool.query(
        `
        SELECT p.id, p.name
        FROM permissions p
        INNER JOIN role_permissions rp
          ON p.id = rp.permission_id
        INNER JOIN user_roles ur
          ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1
          AND p.name = 'zoho_desk'
        LIMIT 1
        `,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied to Zoho Desk.",
        });
      }

      return res.json({
        success: true,
        message:
          "Access granted to Zoho Desk.",
      });
    } catch (error) {
      console.error(
        "Zoho Desk RBAC error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to verify Zoho Desk access.",
      });
    }
  }
);

// =====================================================
// ZOHO BOOKS ACCESS TEST
// GET /api/rbac/books-test
// =====================================================

router.get(
  "/books-test",
  authenticateToken,
  async (req, res) => {
    try {
      const userId =
        req.user?.userId ||
        req.user?.id ||
        req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is missing from authentication token.",
        });
      }

      const result = await pool.query(
        `
        SELECT p.id, p.name
        FROM permissions p
        INNER JOIN role_permissions rp
          ON p.id = rp.permission_id
        INNER JOIN user_roles ur
          ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1
          AND p.name = 'zoho_books'
        LIMIT 1
        `,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied to Zoho Books.",
        });
      }

      return res.json({
        success: true,
        message:
          "Access granted to Zoho Books.",
      });
    } catch (error) {
      console.error(
        "Zoho Books RBAC error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to verify Zoho Books access.",
      });
    }
  }
);

// =====================================================
// FINAL EXPORT
// =====================================================

module.exports = router;
