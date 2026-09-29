const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const supabase = require("../config/supabase");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// AUTH ROUTES LOADED
// =====================================================

console.log("========== AUTH ROUTES FILE LOADED ==========");


// =====================================================
// TEST AUTH ROUTE
// GET /api/auth/test
// =====================================================

router.get("/test", (req, res) => {
  return res.json({
    success: true,
    message: "Auth route is working!",
  });
});


// =====================================================
// REGISTER
// POST /api/auth/register
// =====================================================

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password and role are required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    // -------------------------------------------------
    // Check existing user
    // -------------------------------------------------

    const {
      data: existingUser,
      error: existingUserError,
    } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingUserError) {
      console.error(
        "Check existing user error:",
        existingUserError
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to check existing user",
      });
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "User with this email already exists",
      });
    }

    // -------------------------------------------------
    // Check role
    // -------------------------------------------------

    const {
      data: roleData,
      error: roleError,
    } = await supabase
      .from("roles")
      .select("id, name")
      .eq("name", role)
      .maybeSingle();

    if (roleError) {
      console.error(
        "Role lookup error:",
        roleError
      );

      return res.status(500).json({
        success: false,
        message: "Unable to verify role",
      });
    }

    if (!roleData) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    // -------------------------------------------------
    // Hash password
    // -------------------------------------------------

    const passwordHash =
      await bcrypt.hash(password, 10);

    // -------------------------------------------------
    // Create user
    // -------------------------------------------------

    const {
      data: user,
      error: userError,
    } = await supabase
      .from("users")
      .insert({
        name,
        email: normalizedEmail,
        password_hash: passwordHash,
      })
      .select(
        "id, name, email, is_active, created_at"
      )
      .single();

    if (userError) {
      console.error(
        "User creation error:",
        userError
      );

      return res.status(500).json({
        success: false,
        message: "Unable to create user",
      });
    }

    // -------------------------------------------------
    // Assign role
    // -------------------------------------------------

    const {
      error: userRoleError,
    } = await supabase
      .from("user_roles")
      .insert({
        user_id: user.id,
        role_id: roleData.id,
      });

    if (userRoleError) {
      console.error(
        "User role creation error:",
        userRoleError
      );

      return res.status(500).json({
        success: false,
        message:
          "User created but role assignment failed",
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "User registered successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: roleData.name,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
});


// =====================================================
// LOGIN
// POST /api/auth/login
// =====================================================

router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    // -------------------------------------------------
    // Normalize email
    // -------------------------------------------------

    const normalizedEmail =
      email.trim().toLowerCase();

    // -------------------------------------------------
    // Check JWT configuration
    // -------------------------------------------------

    if (!process.env.JWT_SECRET) {
      console.error(
        "JWT_SECRET is missing from environment."
      );

      return res.status(500).json({
        success: false,
        message:
          "JWT configuration error.",
      });
    }

    // -------------------------------------------------
    // Get user
    // -------------------------------------------------

    const {
      data: user,
      error: userError,
    } = await supabase
      .from("users")
      .select(`
        id,
        name,
        email,
        password_hash,
        is_active,
        user_roles (
          roles (
            id,
            name
          )
        )
      `)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (userError) {
      console.error(
        "LOGIN SUPABASE ERROR"
      );

      console.error(
        "Message:",
        userError.message
      );

      console.error(
        "Code:",
        userError.code
      );

      console.error(
        "Details:",
        userError.details
      );

      console.error(
        "Hint:",
        userError.hint
      );

      return res.status(500).json({
        success: false,
        message:
          "Login database query failed",
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // -------------------------------------------------
    // Check active account
    // -------------------------------------------------

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is inactive",
      });
    }

    // -------------------------------------------------
    // Verify password
    // -------------------------------------------------

    const isPasswordCorrect =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // -------------------------------------------------
    // Get role
    // -------------------------------------------------

    const role =
      user.user_roles &&
      user.user_roles.length > 0 &&
      user.user_roles[0].roles
        ? user.user_roles[0].roles.name
        : null;

    if (!role) {
      return res.status(403).json({
        success: false,
        message:
          "No role assigned to this user",
      });
    }

    // -------------------------------------------------
    // Create JWT
    // -------------------------------------------------

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: role,
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    console.log(
      "========== LOGIN SUCCESS =========="
    );

    console.log(
      "User ID:",
      user.id
    );

    console.log(
      "Email:",
      user.email
    );

    console.log(
      "Role:",
      role
    );

    console.log(
      "JWT created successfully"
    );

    console.log(
      "==================================="
    );

    // -------------------------------------------------
    // Send response
    // -------------------------------------------------

    return res.json({
      success: true,
      message: "Login successful",

      token: token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: role,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    console.error(
      "LOGIN UNEXPECTED ERROR"
    );

    console.error(
      "Message:",
      error.message
    );

    console.error(
      "Stack:",
      error.stack
    );

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});


// =====================================================
// CURRENT USER
// GET /api/auth/me
// =====================================================

router.get(
  "/me",
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
            "User ID is missing from token",
        });
      }

      const {
        data: user,
        error: userError,
      } = await supabase
        .from("users")
        .select(`
          id,
          name,
          email,
          is_active,
          user_roles (
            roles (
              name
            )
          )
        `)
        .eq("id", userId)
        .maybeSingle();

      if (userError) {
        console.error(
          "Profile database error:",
          userError
        );

        return res.status(500).json({
          success: false,
          message:
            "Unable to fetch user details",
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const role =
        user.user_roles &&
        user.user_roles.length > 0 &&
        user.user_roles[0].roles
          ? user.user_roles[0].roles.name
          : null;

      return res.json({
        success: true,
        message:
          "Authenticated user details",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: role,
          is_active: user.is_active,
        },
      });
    } catch (error) {
      console.error(
        "Profile error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch user details",
      });
    }
  }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;
