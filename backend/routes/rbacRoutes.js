const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");

const router = express.Router();

// =====================================================
// RBAC TEST
// =====================================================

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "RBAC route is working!"
  });
});

// =====================================================
// ZOHO PEOPLE TEST
// =====================================================

router.get(
  "/people-test",
  authenticateToken,
  requirePermission("zoho_people"),
  (req, res) => {
    res.json({
      success: true,
      message: "Access granted to Zoho People",
      user: req.user
    });
  }
);

// =====================================================
// ZOHO CRM TEST
// =====================================================

router.get(
  "/crm-test",
  authenticateToken,
  requirePermission("zoho_crm"),
  (req, res) => {
    res.json({
      success: true,
      message: "Access granted to Zoho CRM",
      user: req.user
    });
  }
);

// =====================================================
// ZOHO DESK TEST
// =====================================================

router.get(
  "/desk-test",
  authenticateToken,
  requirePermission("zoho_desk"),
  (req, res) => {
    res.json({
      success: true,
      message: "Access granted to Zoho Desk",
      user: req.user
    });
  }
);

// =====================================================
// ZOHO BOOKS TEST
// =====================================================

router.get(
  "/books-test",
  authenticateToken,
  requirePermission("zoho_books"),
  (req, res) => {
    res.json({
      success: true,
      message: "Access granted to Zoho Books",
      user: req.user
    });
  }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;