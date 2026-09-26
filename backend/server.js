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

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/rbac", rbacRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/zoho", zohoRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Employee Portal Backend is running!"
  });
});

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Hello from the backend!"
  });
});

app.get("/api/admin-direct-test", (req, res) => {
  res.json({
    success: true,
    message: "Direct admin test route is working!"
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "PostgreSQL connected successfully!",
      time: result.rows[0].now
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
      message: "Database connection failed"
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});