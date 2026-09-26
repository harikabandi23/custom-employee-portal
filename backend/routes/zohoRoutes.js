const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");
const { zohoApiRequest } = require("../services/zohoApiService");

const router = express.Router();

router.get(
  "/people",
  authenticateToken,
  requirePermission("zoho_people"),
  async (req, res) => {
    try {
      const data = await zohoApiRequest({
        method: "GET",
        url: "https://people.zoho.in/people/api/forms/employee/getRecords"
      });

      res.json({
        success: true,
        message: "Zoho People employee records retrieved successfully",
        data
      });
    } catch (error) {
      console.error("Zoho People error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to retrieve Zoho People employee records"
      });
    }
  }
);

module.exports = router;