require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const rbacRoutes = require("./routes/rbacRoutes");
const adminRoutes = require("./routes/adminRoutes");
const zohoRoutes = require("./routes/zohoRoutes");

console.log("AUTH ROUTES LOADED");
console.log("RBAC ROUTES LOADED");
console.log("ADMIN ROUTES LOADED");
console.log("ZOHO ROUTES LOADED");

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());

// =====================================================
// ROUTES
// =====================================================

app.use("/api/auth", authRoutes);
app.use("/api/rbac", rbacRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/zoho", zohoRoutes);

// =====================================================
// ROOT TEST
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Employee Portal Backend is running!",
  });
});

// =====================================================
// API TEST
// =====================================================

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Hello from the backend!",
  });
});

// =====================================================
// ADMIN DIRECT TEST
// =====================================================

app.get("/api/admin-direct-test", (req, res) => {
  res.json({
    success: true,
    message: "Direct admin test route is working!",
  });
});

// =====================================================
// DATABASE TEST
// =====================================================

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "PostgreSQL connected successfully!",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("========== DATABASE ERROR ==========");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Detail:", error.detail);
    console.error("Host:", error.hostname);
    console.error("====================================");

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

// =====================================================
// SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, "127.0.0.1", () => {
  console.log(
    `Server running on http://127.0.0.1:${PORT}`
  );
});