const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  try {
    console.log("========== AUTH MIDDLEWARE ==========");

    const authHeader = req.headers.authorization;

    console.log(
      "Authorization header received:",
      authHeader ? "YES" : "NO"
    );

    if (!authHeader) {
      console.log("ERROR: Authorization header missing");

      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    const parts = authHeader.split(" ");

    console.log("Authorization format:", parts[0]);

    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer"
    ) {
      console.log("ERROR: Invalid authorization format");

      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = parts[1];

    console.log(
      "Token received:",
      token ? "YES" : "NO"
    );

    console.log(
      "Token length:",
      token ? token.length : 0
    );

    console.log(
      "JWT_SECRET loaded:",
      process.env.JWT_SECRET ? "YES" : "NO"
    );

    console.log(
      "JWT_SECRET length:",
      process.env.JWT_SECRET
        ? process.env.JWT_SECRET.length
        : 0
    );

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    console.log("JWT VERIFIED SUCCESSFULLY");

    console.log("Decoded user:", {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    });

    req.user = decoded;

    console.log("====================================");

    next();

  } catch (error) {

    console.error(
      "========== JWT AUTH ERROR =========="
    );

    console.error(
      "Error name:",
      error.name
    );

    console.error(
      "Error message:",
      error.message
    );

    console.error(
      "===================================="
    );

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

module.exports = authenticateToken;