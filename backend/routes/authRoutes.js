const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const supabase = require("../config/supabase");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth route is working!"
  });
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and role are required"
      });
    }

    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUserError) {
      console.error("Check existing user error:", existingUserError);

      return res.status(500).json({
        success: false,
        message: "Unable to check existing user"
      });
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id, name")
      .eq("name", role)
      .maybeSingle();

    if (roleError) {
      console.error("Role lookup error:", roleError);

      return res.status(500).json({
        success: false,
        message: "Unable to verify role"
      });
    }

    if (!roleData) {
      return res.status(400).json({
        success: false,
        message: "Invalid role"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        name,
        email,
        password_hash: passwordHash
      })
      .select("id, name, email, is_active, created_at")
      .single();

    if (userError) {
      console.error("User creation error:", userError);

      return res.status(500).json({
        success: false,
        message: "Unable to create user"
      });
    }

    const { error: userRoleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: user.id,
        role_id: roleData.id
      });

    if (userRoleError) {
      console.error("User role creation error:", userRoleError);

      return res.status(500).json({
        success: false,
        message: "User created but role assignment failed"
      });
    }

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: roleData.name,
        is_active: user.is_active
      }
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const { data: user, error: userError } = await supabase
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
      .eq("email", email)
      .maybeSingle();

    if (userError) {
      console.error("=================================");
      console.error("LOGIN SUPABASE ERROR");
      console.error("Message:", userError.message);
      console.error("Code:", userError.code);
      console.error("Details:", userError.details);
      console.error("Hint:", userError.hint);
      console.error("=================================");

      return res.status(500).json({
        success: false,
        message: "Login database query failed"
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive"
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const role =
      user.user_roles &&
      user.user_roles.length > 0 &&
      user.user_roles[0].roles
        ? user.user_roles[0].roles.name
        : null;

    if (!role) {
      return res.status(403).json({
        success: false,
        message: "No role assigned to this user"
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h"
      }
    );

    res.json({
      success: true,
      message: "Login successful",
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: role,
        is_active: user.is_active
      }
    });
  } catch (error) {
    console.error("=================================");
    console.error("LOGIN UNEXPECTED ERROR");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("=================================");

    res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
});

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const { data: user, error: userError } = await supabase
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
      .eq("id", req.user.userId)
      .maybeSingle();

    if (userError) {
      console.error("Profile database error:", userError);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch user details"
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const role =
      user.user_roles &&
      user.user_roles.length > 0 &&
      user.user_roles[0].roles
        ? user.user_roles[0].roles.name
        : null;

    res.json({
      success: true,
      message: "Authenticated user details",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: role,
        is_active: user.is_active
      }
    });
  } catch (error) {
    console.error("Profile error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch user details"
    });
  }
});

module.exports = router;