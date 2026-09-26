require("dotenv").config();

const pool = require("./config/db");

async function setupDatabase() {
  console.log("Starting database setup...");

  try {
    console.log("Testing PostgreSQL connection...");

    const result = await pool.query("SELECT NOW()");

    console.log("PostgreSQL connected!");
    console.log("Database time:", result.rows[0].now);

    // 1. Users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Users table ready!");

    // 2. Roles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT
      );
    `);

    console.log("Roles table ready!");

    // 3. Permissions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT
      );
    `);

    console.log("Permissions table ready!");

    // 4. User-Roles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER NOT NULL,
        role_id INTEGER NOT NULL,

        PRIMARY KEY (user_id, role_id),

        FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE,

        FOREIGN KEY (role_id)
          REFERENCES roles(id)
          ON DELETE CASCADE
      );
    `);

    console.log("User-Roles table ready!");

    // 5. Role-Permissions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER NOT NULL,
        permission_id INTEGER NOT NULL,

        PRIMARY KEY (role_id, permission_id),

        FOREIGN KEY (role_id)
          REFERENCES roles(id)
          ON DELETE CASCADE,

        FOREIGN KEY (permission_id)
          REFERENCES permissions(id)
          ON DELETE CASCADE
      );
    `);

    console.log("Role-Permissions table ready!");

    // 6. Audit Logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id INTEGER,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE SET NULL
      );
    `);

    console.log("Audit Logs table ready!");

    // 7. Insert Roles
    await pool.query(`
      INSERT INTO roles (name, description)
      VALUES
        ('Admin', 'Full access to employee portal management'),
        ('HR', 'Access to HR-related applications and functions'),
        ('Sales', 'Access to sales and CRM-related functions'),
        ('Support', 'Access to customer support functions'),
        ('Finance', 'Access to finance and accounting functions')
      ON CONFLICT (name) DO NOTHING;
    `);

    console.log("Roles inserted successfully!");

    // 8. Insert Permissions
    await pool.query(`
      INSERT INTO permissions (name, description)
      VALUES
        ('zoho_people', 'Access to Zoho People'),
        ('zoho_crm', 'Access to Zoho CRM'),
        ('zoho_desk', 'Access to Zoho Desk'),
        ('zoho_books', 'Access to Zoho Books'),
        ('manage_users', 'Create, update and manage users'),
        ('manage_roles', 'Manage employee roles'),
        ('manage_permissions', 'Manage role permissions'),
        ('view_audit_logs', 'View system audit logs')
      ON CONFLICT (name) DO NOTHING;
    `);

    console.log("Permissions inserted successfully!");

    console.log("");
    console.log("=================================");
    console.log("DATABASE SETUP COMPLETED!");
    console.log("=================================");

  } catch (error) {
    console.error("DATABASE SETUP ERROR:");
    console.error(error);
  } finally {
    await pool.end();
  }
}

setupDatabase();