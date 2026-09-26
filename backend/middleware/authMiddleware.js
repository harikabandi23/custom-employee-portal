const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  try {
    // Get the Authorization header
    const authHeader = req.headers.authorization;

    // Check if token exists
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access token is required"
      });
    }

    // Expected format:
    // Bearer <JWT_TOKEN>
    const parts = authHeader.split(" ");

    // Check Authorization format
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format"
      });
    }

    // Get the actual token
    const token = parts[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Store decoded user information
    // for the protected route
    req.user = decoded;

    // Continue to the next function
    next();

  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
}

module.exports = authenticateToken;