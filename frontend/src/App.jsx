import { useEffect, useState } from "react";

/*
===========================================================
CUSTOM EMPLOYEE PORTAL
Frontend: React
Backend: Node.js + Express
Database: PostgreSQL
Integration: Zoho People
===========================================================
*/

const API_URL = "http://127.0.0.1:5000";

function App() {
  // =========================================================
  // AUTH STATE
  // =========================================================

  const [token, setToken] = useState(
    localStorage.getItem("employeePortalToken") || ""
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("employeePortalUser") || "null"
      );
    } catch {
      return null;
    }
  });

  const [currentPage, setCurrentPage] = useState("dashboard");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // DASHBOARD
  // =========================================================

  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    activeUsers: 0,
    roles: 0,
    permissions: 0,
  });

  // =========================================================
  // ZOHO EMPLOYEES
  // =========================================================

  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // =========================================================
  // ADMIN DATA
  // =========================================================

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // =========================================================
  // ROLE PERMISSIONS
  // =========================================================

  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);

  // =========================================================
  // MODALS
  // =========================================================

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showCreatePermission, setShowCreatePermission] =
    useState(false);

  // =========================================================
  // FORMS
  // =========================================================

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
  });

  const [newRole, setNewRole] = useState("");
  const [newPermission, setNewPermission] = useState("");

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // =========================================================
  // LOGOUT
  // =========================================================

  const logout = () => {
    localStorage.removeItem("employeePortalToken");
    localStorage.removeItem("employeePortalUser");

    setToken("");
    setUser(null);

    setCurrentPage("dashboard");

    setEmployees([]);
    setUsers([]);
    setRoles([]);
    setPermissions([]);
    setAuditLogs([]);

    setSelectedRole(null);
    setRolePermissions([]);

    setError("");
  };

  // =========================================================
  // API REQUEST HELPER
  // =========================================================

  const apiRequest = async (endpoint, options = {}) => {
    const currentToken =
      localStorage.getItem("employeePortalToken") || token;

    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (currentToken) {
      headers.Authorization = `Bearer ${currentToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (response.status === 401) {
      logout();

      throw new Error(
        data.message ||
          "Your session has expired. Please login again."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Request failed with status ${response.status}`
      );
    }

    return data;
  };

  // =========================================================
  // LOGIN
  // =========================================================

  const handleLogin = async (event) => {
    event.preventDefault();

    setLoginError("");
    setLoginLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: loginForm.email,
            password: loginForm.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      const receivedToken =
        data.token ||
        data.accessToken ||
        data.access_token;

      const receivedUser =
        data.user ||
        data.employee ||
        data.data?.user ||
        {
          email: loginForm.email,
        };

      if (!receivedToken) {
        throw new Error(
          "Login succeeded but no JWT token was returned."
        );
      }

      localStorage.setItem(
        "employeePortalToken",
        receivedToken
      );

      localStorage.setItem(
        "employeePortalUser",
        JSON.stringify(receivedUser)
      );

      setToken(receivedToken);
      setUser(receivedUser);

      setCurrentPage("dashboard");

      setLoginForm({
        email: "",
        password: "",
      });
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      setLoginError(
        err.message || "Unable to login"
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // =========================================================
  // DASHBOARD
  // =========================================================

  const loadDashboard = async () => {
    try {
      const [usersResult, rolesResult, permissionsResult] =
        await Promise.allSettled([
          apiRequest("/api/admin/users"),
          apiRequest("/api/admin/roles"),
          apiRequest("/api/admin/permissions"),
        ]);

      const allUsers =
        usersResult.status === "fulfilled"
          ? usersResult.value.users || []
          : [];

      const allRoles =
        rolesResult.status === "fulfilled"
          ? rolesResult.value.roles || []
          : [];

      const allPermissions =
        permissionsResult.status === "fulfilled"
          ? permissionsResult.value.permissions || []
          : [];

      setDashboardData({
        totalUsers: allUsers.length,

        activeUsers: allUsers.filter(
          (item) =>
            item.is_active === true ||
            item.is_active === "true" ||
            item.is_active === 1
        ).length,

        roles: allRoles.length,

        permissions: allPermissions.length,
      });
    } catch (err) {
      console.error("DASHBOARD ERROR:", err);
    }
  };

  // =========================================================
  // USERS
  // =========================================================

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest(
        "/api/admin/users"
      );

      const allUsers = data.users || [];

      setUsers(allUsers);

      setDashboardData((previous) => ({
        ...previous,
        totalUsers: allUsers.length,

        activeUsers: allUsers.filter(
          (item) =>
            item.is_active === true ||
            item.is_active === "true" ||
            item.is_active === 1
        ).length,
      }));
    } catch (err) {
      console.error("LOAD USERS ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      await apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(newUser),
      });

      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "",
      });

      setShowCreateUser(false);

      await loadUsers();
    } catch (err) {
      console.error("CREATE USER ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (
    id,
    currentStatus
  ) => {
    try {
      await apiRequest(
        `/api/admin/users/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            is_active: !currentStatus,
          }),
        }
      );

      await loadUsers();
    } catch (err) {
      console.error(
        "UPDATE USER STATUS ERROR:",
        err
      );

      setError(err.message);
    }
  };

  // =========================================================
  // ROLES
  // =========================================================

  const loadRoles = async () => {
    try {
      const data = await apiRequest(
        "/api/admin/roles"
      );

      const allRoles = data.roles || [];

      setRoles(allRoles);

      setDashboardData((previous) => ({
        ...previous,
        roles: allRoles.length,
      }));
    } catch (err) {
      console.error("LOAD ROLES ERROR:", err);
      setError(err.message);
    }
  };

  const createRole = async (event) => {
    event.preventDefault();

    if (!newRole.trim()) {
      return;
    }

    try {
      await apiRequest("/api/admin/roles", {
        method: "POST",
        body: JSON.stringify({
          name: newRole.trim(),
        }),
      });

      setNewRole("");
      setShowCreateRole(false);

      await loadRoles();
    } catch (err) {
      console.error("CREATE ROLE ERROR:", err);
      setError(err.message);
    }
  };

  // =========================================================
  // PERMISSIONS
  // =========================================================

  const loadPermissions = async () => {
    try {
      const data = await apiRequest(
        "/api/admin/permissions"
      );

      const allPermissions =
        data.permissions || [];

      setPermissions(allPermissions);

      setDashboardData((previous) => ({
        ...previous,
        permissions: allPermissions.length,
      }));
    } catch (err) {
      console.error(
        "LOAD PERMISSIONS ERROR:",
        err
      );

      setError(err.message);
    }
  };

  const createPermission = async (event) => {
    event.preventDefault();

    if (!newPermission.trim()) {
      return;
    }

    try {
      await apiRequest(
        "/api/admin/permissions",
        {
          method: "POST",
          body: JSON.stringify({
            name: newPermission.trim(),
          }),
        }
      );

      setNewPermission("");
      setShowCreatePermission(false);

      await loadPermissions();
    } catch (err) {
      console.error(
        "CREATE PERMISSION ERROR:",
        err
      );

      setError(err.message);
    }
  };

  // =========================================================
  // ROLE PERMISSIONS
  // =========================================================

  const loadRolePermissions = async (
    roleId
  ) => {
    try {
      const data = await apiRequest(
        `/api/admin/roles/${roleId}/permissions`
      );

      setSelectedRole(
        data.role || null
      );

      setRolePermissions(
        data.permissions || []
      );
    } catch (err) {
      console.error(
        "ROLE PERMISSIONS ERROR:",
        err
      );

      setError(err.message);
    }
  };

  const assignPermission = async (
    permissionId
  ) => {
    if (!selectedRole) {
      return;
    }

    try {
      await apiRequest(
        `/api/admin/roles/${selectedRole.id}/permissions`,
        {
          method: "POST",
          body: JSON.stringify({
            permissionId: Number(permissionId),
          }),
        }
      );

      await loadRolePermissions(
        selectedRole.id
      );
    } catch (err) {
      console.error(
        "ASSIGN PERMISSION ERROR:",
        err
      );

      setError(err.message);
    }
  };

  // =========================================================
  // AUDIT LOGS
  // =========================================================

  const loadAuditLogs = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest(
        "/api/admin/audit-logs"
      );

      setAuditLogs(
        data.auditLogs || []
      );
    } catch (err) {
      console.error(
        "AUDIT LOG ERROR:",
        err
      );

      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // ZOHO VALUE HELPER
  // =========================================================

  const cleanKey = (key) => {
    return String(key)
      .toLowerCase()
      .replace(/[\s_-]/g, "");
  };

  const extractPrimitiveValue = (value) => {
    if (
      value === undefined ||
      value === null
    ) {
      return null;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }

    if (typeof value === "object") {
      const possibleKeys = [
        "value",
        "display_value",
        "displayValue",
        "name",
        "text",
        "label",
        "title",
      ];

      for (const key of possibleKeys) {
        if (
          value[key] !== undefined &&
          value[key] !== null &&
          String(value[key]).trim() !== ""
        ) {
          return value[key];
        }
      }
    }

    return null;
  };

  // =========================================================
  // FLEXIBLE ZOHO FIELD SEARCH
  // =========================================================

  const findFieldValue = (
    employee,
    aliases
  ) => {
    if (!employee) {
      return "N/A";
    }

    const normalizedAliases =
      aliases.map(cleanKey);

    // -------------------------------------------------------
    // First check direct fields
    // -------------------------------------------------------

    for (const key of Object.keys(employee)) {
      const normalizedKey =
        cleanKey(key);

      if (
        normalizedAliases.includes(
          normalizedKey
        )
      ) {
        const value =
          extractPrimitiveValue(
            employee[key]
          );

        if (
          value !== null &&
          String(value).trim() !== ""
        ) {
          return value;
        }
      }
    }

    // -------------------------------------------------------
    // Recursively search nested objects
    // -------------------------------------------------------

    const searchNested = (
      object,
      depth = 0
    ) => {
      if (
        !object ||
        typeof object !== "object" ||
        depth > 5
      ) {
        return null;
      }

      if (Array.isArray(object)) {
        for (const item of object) {
          const result =
            searchNested(
              item,
              depth + 1
            );

          if (
            result !== null &&
            result !== ""
          ) {
            return result;
          }
        }

        return null;
      }

      for (const key of Object.keys(object)) {
        const normalizedKey =
          cleanKey(key);

        if (
          normalizedAliases.includes(
            normalizedKey
          )
        ) {
          const value =
            extractPrimitiveValue(
              object[key]
            );

          if (
            value !== null &&
            String(value).trim() !== ""
          ) {
            return value;
          }
        }
      }

      for (const key of Object.keys(object)) {
        const value =
          object[key];

        if (
          value &&
          typeof value === "object"
        ) {
          const result =
            searchNested(
              value,
              depth + 1
            );

          if (
            result !== null &&
            result !== ""
          ) {
            return result;
          }
        }
      }

      return null;
    };

    const result =
      searchNested(employee);

    if (
      result !== null &&
      result !== undefined &&
      String(result).trim() !== ""
    ) {
      return result;
    }

    return "N/A";
  };

  // =========================================================
  // EXTRACT EMPLOYEE RECORDS
  // =========================================================

  const extractEmployeeRecords = (
    data
  ) => {
    console.log(
      "========== RAW ZOHO RESPONSE =========="
    );

    console.log(data);

    if (!data) {
      return [];
    }

    /*
      YOUR BACKEND RESPONSE:

      {
        success: true,
        count: 20,
        message: "20 employees retrieved successfully",
        employees: [...]
      }
    */

    if (
      Array.isArray(
        data.employees
      )
    ) {
      return data.employees;
    }

    if (
      Array.isArray(
        data.data?.employees
      )
    ) {
      return data.data.employees;
    }

    if (
      Array.isArray(data.data)
    ) {
      return data.data;
    }

    if (
      Array.isArray(
        data.response
      )
    ) {
      return data.response;
    }

    if (
      Array.isArray(
        data.records
      )
    ) {
      return data.records;
    }

    if (
      Array.isArray(
        data.result
      )
    ) {
      return data.result;
    }

    return [];
  };

  // =========================================================
  // NORMALIZE EMPLOYEE
  // =========================================================

  const normalizeEmployee = (
    employee,
    index
  ) => {
    console.log(
      `Employee ${index + 1}:`,
      employee
    );

    const firstName =
      findFieldValue(employee, [
        "First Name",
        "FirstName",
        "first_name",
        "firstName",
        "firstname",
      ]);

    const lastName =
      findFieldValue(employee, [
        "Last Name",
        "LastName",
        "last_name",
        "lastName",
        "lastname",
      ]);

    let name =
      findFieldValue(employee, [
        "Employee Name",
        "Employee_Name",
        "employee_name",
        "EmployeeName",
        "employeeName",
        "Name",
        "name",
        "Full Name",
        "full_name",
        "fullName",
      ]);

    if (
      name === "N/A" &&
      (firstName !== "N/A" ||
        lastName !== "N/A")
    ) {
      name = `${firstName !== "N/A"
        ? firstName
        : ""} ${
        lastName !== "N/A"
          ? lastName
          : ""
      }`.trim();
    }

    // If still no name, try common Zoho fields
    if (name === "N/A") {
      name = findFieldValue(
        employee,
        [
          "displayName",
          "Display Name",
          "employee_display_name",
          "full_name",
        ]
      );
    }

    return {
      id: findFieldValue(
        employee,
        [
          "Employee ID",
          "EmployeeID",
          "employee_id",
          "employeeId",
          "Employee_ID",
          "Zoho_ID",
          "Zoho ID",
          "recordId",
          "record_id",
          "id",
          "ID",
          "employeeNumber",
          "employee_number",
          "employeeCode",
          "employee_code",
        ]
      ),

      name,

      email: findFieldValue(
        employee,
        [
          "Email ID",
          "Email",
          "email",
          "email_id",
          "EmailID",
          "work_email",
          "Work Email",
          "emailAddress",
          "email_address",
        ]
      ),

      department:
        findFieldValue(
          employee,
          [
            "Department",
            "department",
            "Department Name",
            "department_name",
            "departmentName",
          ]
        ),

      designation:
        findFieldValue(
          employee,
          [
            "Designation",
            "designation",
            "Job Title",
            "job_title",
            "jobTitle",
            "title",
            "Title",
            "role",
          ]
        ),

      status: findFieldValue(
        employee,
        [
          "Employee Status",
          "Status",
          "status",
          "employee_status",
          "employeeStatus",
        ]
      ),

      raw: employee,

      index,
    };
  };

  // =========================================================
  // LOAD ZOHO PEOPLE
  // =========================================================

  const loadZohoPeople = async () => {
    setEmployeesLoading(true);
    setError("");

    try {
      const data = await apiRequest(
        "/api/zoho/people"
      );

      console.log(
        "========== RAW ZOHO RESPONSE =========="
      );

      console.log(data);

      const records =
        extractEmployeeRecords(data);

      console.log(
        "========== EMPLOYEE RECORDS =========="
      );

      console.log(records);

      console.log(
        "Employee count:",
        records.length
      );

      const normalized =
        records.map(
          (employee, index) =>
            normalizeEmployee(
              employee,
              index
            )
        );

      console.log(
        "========== NORMALIZED EMPLOYEES =========="
      );

      console.table(normalized);

      setEmployees(normalized);
    } catch (err) {
      console.error(
        "ZOHO PEOPLE ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to load Zoho employees."
      );
    } finally {
      setEmployeesLoading(false);
    }
  };

  // =========================================================
  // PAGE LOADING
  // =========================================================

  useEffect(() => {
    if (!token) {
      return;
    }

    loadDashboard();
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    if (
      currentPage === "users"
    ) {
      loadUsers();
    }

    if (
      currentPage === "roles"
    ) {
      loadRoles();
      loadPermissions();
    }

    if (
      currentPage === "permissions"
    ) {
      loadPermissions();
    }

    if (
      currentPage === "audit"
    ) {
      loadAuditLogs();
    }

    if (
      currentPage === "zoho"
    ) {
      loadZohoPeople();
    }
  }, [
    currentPage,
    token,
  ]);

  // =========================================================
  // LOGIN PAGE
  // =========================================================

  if (!token || !user) {
    return (
      <>
        <style>{GLOBAL_STYLES}</style>

        <div className="login-page">
          <div className="login-card">
            <div className="login-brand">
              <div className="logo-circle">
                Z
              </div>

              <div>
                <div className="brand-title">
                  Custom Employee Portal
                </div>

                <div className="brand-subtitle">
                  Zoho People Management
                </div>
              </div>
            </div>

            <div className="login-heading">
              Welcome back
            </div>

            <p className="login-description">
              Sign in to access your employee
              portal.
            </p>

            <form
              onSubmit={handleLogin}
              className="login-form"
            >
              <label>Email address</label>

              <input
                type="email"
                value={
                  loginForm.email
                }
                onChange={(event) =>
                  setLoginForm({
                    ...loginForm,
                    email:
                      event.target.value,
                  })
                }
                placeholder="Enter your email"
                required
              />

              <label>Password</label>

              <input
                type="password"
                value={
                  loginForm.password
                }
                onChange={(event) =>
                  setLoginForm({
                    ...loginForm,
                    password:
                      event.target.value,
                  })
                }
                placeholder="Enter your password"
                required
              />

              {loginError && (
                <div className="error-box">
                  {loginError}
                </div>
              )}

              <button
                className="primary-button login-button"
                type="submit"
                disabled={loginLoading}
              >
                {loginLoading
                  ? "Signing in..."
                  : "Sign In"}
              </button>
            </form>

            <div className="login-footer">
              Secure employee management portal
            </div>
          </div>
        </div>
      </>
    );
  }

  // =========================================================
  // MAIN PORTAL
  // =========================================================

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div className="portal-layout">

        {/* ===================================================
            SIDEBAR
        =================================================== */}

        <aside className="sidebar">

          <div className="sidebar-brand">
            <div className="logo-circle small">
              Z
            </div>

            <div>
              <div className="sidebar-brand-title">
                Employee Portal
              </div>

              <div className="sidebar-brand-subtitle">
                Custom Zoho Portal
              </div>
            </div>
          </div>

          <div className="sidebar-user">
            <div className="user-avatar">
              {(user.name ||
                user.email ||
                "U")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="sidebar-user-info">
              <strong>
                {user.name ||
                  "Employee"}
              </strong>

              <span>
                {user.email ||
                  "User"}
              </span>

              <small>
                {user.role ||
                  "Employee"}
              </small>
            </div>
          </div>

          <nav className="sidebar-nav">

            <button
              className={
                currentPage ===
                "dashboard"
                  ? "nav-button active"
                  : "nav-button"
              }
              onClick={() =>
                setCurrentPage(
                  "dashboard"
                )
              }
            >
              <span>⌂</span>
              Dashboard
            </button>

            <button
              className={
                currentPage ===
                "profile"
                  ? "nav-button active"
                  : "nav-button"
              }
              onClick={() =>
                setCurrentPage(
                  "profile"
                )
              }
            >
              <span>◉</span>
              My Profile
            </button>

            <button
              className={
                currentPage ===
                "zoho"
                  ? "nav-button active"
                  : "nav-button"
              }
              onClick={() =>
                setCurrentPage(
                  "zoho"
                )
              }
            >
              <span>◉</span>
              Zoho People
            </button>

            <div className="nav-section-title">
              ADMINISTRATION
            </div>

            <button
              className={
                currentPage ===
                "users"
                  ? "nav-button active"
                  : "nav-button"
              }
              onClick={() =>
                setCurrentPage(
                  "users"
                )
              }
            >
              <span>♙</span>
              Users
            </button>

            <button
              className={
                currentPage ===
                "roles"
                  ? "nav-button active"
                  : "nav-button"
              }
              onClick={() =>
                setCurrentPage(
                  "roles"
                )
              }
            >
              <span>◆</span>
              Roles
            </button>

            <button
              className={
                currentPage ===
                "permissions"
                  ? "nav-button active"
                  : "nav-button"
              }
              onClick={() =>
                setCurrentPage(
                  "permissions"
                )
              }
            >
              <span>◇</span>
              Permissions
            </button>

            <button
              className={
                currentPage ===
                "audit"
                  ? "nav-button active"
                  : "nav-button"
              }
              onClick={() =>
                setCurrentPage(
                  "audit"
                )
              }
            >
              <span>▤</span>
              Audit Logs
            </button>

          </nav>

          <button
            className="logout-button"
            onClick={logout}
          >
            <span>↪</span>
            Logout
          </button>

        </aside>

        {/* ===================================================
            MAIN CONTENT
        =================================================== */}

        <main className="main-area">

          <header className="topbar">

            <div>
              <div className="breadcrumb">
                Custom Employee Portal
              </div>

              <h1>
                {currentPage ===
                  "dashboard" &&
                  "Dashboard"}

                {currentPage ===
                  "profile" &&
                  "My Profile"}

                {currentPage ===
                  "zoho" &&
                  "Zoho People"}

                {currentPage ===
                  "users" &&
                  "User Management"}

                {currentPage ===
                  "roles" &&
                  "Role Management"}

                {currentPage ===
                  "permissions" &&
                  "Permission Management"}

                {currentPage ===
                  "audit" &&
                  "Audit Logs"}
              </h1>
            </div>

            <div className="topbar-user">
              <div className="topbar-avatar">
                {(user.name ||
                  user.email ||
                  "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>
                  {user.name ||
                    user.email}
                </strong>

                <span>
                  {user.role ||
                    "Employee"}
                </span>
              </div>
            </div>

          </header>

          {error && (
            <div className="page-error">
              <span>{error}</span>

              <button
                onClick={() =>
                  setError("")
                }
              >
                ×
              </button>
            </div>
          )}

          {/* =================================================
              DASHBOARD
          ================================================= */}

          {currentPage ===
            "dashboard" && (
            <section className="page-content">

              <div className="welcome-card">

                <div>
                  <div className="eyebrow">
                    EMPLOYEE PORTAL
                  </div>

                  <h2>
                    Welcome,{" "}
                    {user.name ||
                      "Employee"}{" "}
                    👋
                  </h2>

                  <p>
                    Manage employees,
                    roles, permissions
                    and Zoho People
                    data from one
                    secure portal.
                  </p>
                </div>

                <div className="welcome-role">
                  {user.role ||
                    "Employee"}
                </div>

              </div>

              <div className="stats-grid">

                <div className="stat-card">
                  <div className="stat-icon blue">
                    ◉
                  </div>

                  <div>
                    <span>
                      Total Users
                    </span>

                    <strong>
                      {
                        dashboardData.totalUsers
                      }
                    </strong>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon green">
                    ✓
                  </div>

                  <div>
                    <span>
                      Active Users
                    </span>

                    <strong>
                      {
                        dashboardData.activeUsers
                      }
                    </strong>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon purple">
                    ◆
                  </div>

                  <div>
                    <span>
                      Roles
                    </span>

                    <strong>
                      {
                        dashboardData.roles
                      }
                    </strong>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon orange">
                    ◇
                  </div>

                  <div>
                    <span>
                      Permissions
                    </span>

                    <strong>
                      {
                        dashboardData.permissions
                      }
                    </strong>
                  </div>
                </div>

              </div>

              <div className="dashboard-grid">

                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>
                        Portal Features
                      </h3>

                      <p>
                        Available system
                        capabilities
                      </p>
                    </div>
                  </div>

                  <div className="feature-list">
                    <div>
                      <span>✓</span>
                      JWT Authentication
                    </div>

                    <div>
                      <span>✓</span>
                      Role-Based Access
                      Control
                    </div>

                    <div>
                      <span>✓</span>
                      User Management
                    </div>

                    <div>
                      <span>✓</span>
                      Role Management
                    </div>

                    <div>
                      <span>✓</span>
                      Permission
                      Management
                    </div>

                    <div>
                      <span>✓</span>
                      Audit Logging
                    </div>

                    <div>
                      <span>✓</span>
                      Zoho People
                      Integration
                    </div>
                  </div>
                </div>

                <div className="panel">

                  <div className="panel-header">
                    <div>
                      <h3>
                        Current Account
                      </h3>

                      <p>
                        Your portal account
                        information
                      </p>
                    </div>
                  </div>

                  <div className="account-row">
                    <span>
                      Name
                    </span>

                    <strong>
                      {user.name ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="account-row">
                    <span>
                      Email
                    </span>

                    <strong>
                      {user.email ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="account-row">
                    <span>
                      Role
                    </span>

                    <strong>
                      {user.role ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="account-row">
                    <span>
                      Status
                    </span>

                    <strong className="status-active">
                      Active
                    </strong>
                  </div>

                </div>

              </div>

            </section>
          )}

          {/* =================================================
              PROFILE
          ================================================= */}

          {currentPage ===
            "profile" && (
            <section className="page-content">

              <div className="profile-card">

                <div className="profile-avatar">
                  {(user.name ||
                    user.email ||
                    "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <h2>
                  {user.name ||
                    "Employee"}
                </h2>

                <p>
                  {user.email ||
                    "N/A"}
                </p>

                <div className="profile-grid">

                  <div>
                    <span>
                      User ID
                    </span>

                    <strong>
                      {user.userId ||
                        user.id ||
                        "N/A"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Role
                    </span>

                    <strong>
                      {user.role ||
                        "N/A"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Email
                    </span>

                    <strong>
                      {user.email ||
                        "N/A"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Status
                    </span>

                    <strong className="status-active">
                      Active
                    </strong>
                  </div>

                </div>

              </div>

            </section>
          )}

          {/* =================================================
              ZOHO PEOPLE
          ================================================= */}

          {currentPage ===
            "zoho" && (
            <section className="page-content">

              <div className="section-header">

                <div>
                  <div className="eyebrow">
                    ZOHO INTEGRATION
                  </div>

                  <h2>
                    Zoho People Employees
                  </h2>

                  <p>
                    Employee records
                    retrieved from
                    Zoho People.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={
                    loadZohoPeople
                  }
                  disabled={
                    employeesLoading
                  }
                >
                  {employeesLoading
                    ? "Loading..."
                    : "↻ Refresh Employees"}
                </button>

              </div>

              <div className="employee-summary">

                <div>
                  <strong>
                    {employees.length}
                  </strong>

                  <span>
                    Employees Retrieved
                  </span>
                </div>

                <div className="connection-status">
                  <span className="online-dot"></span>
                  Zoho People Connected
                </div>

              </div>

              {employeesLoading ? (
                <div className="loading-card">
                  <div className="loader"></div>

                  <strong>
                    Loading employee
                    records...
                  </strong>

                  <span>
                    Fetching data from
                    Zoho People
                  </span>
                </div>
              ) : employees.length ===
                0 ? (
                <div className="empty-card">

                  <div className="empty-icon">
                    ◉
                  </div>

                  <h3>
                    No employees found
                  </h3>

                  <p>
                    The Zoho API did not
                    return any employee
                    records.
                  </p>

                  <button
                    className="primary-button"
                    onClick={
                      loadZohoPeople
                    }
                  >
                    Try Again
                  </button>

                </div>
              ) : (
                <div className="employee-table-card">

                  <div className="table-header">
                    <div>
                      <h3>
                        Employee Directory
                      </h3>

                      <span>
                        {employees.length}{" "}
                        employee records
                      </span>
                    </div>
                  </div>

                  <div className="table-scroll">

                    <table className="data-table">

                      <thead>
                        <tr>
                          <th>
                            Employee ID
                          </th>

                          <th>
                            Employee
                          </th>

                          <th>
                            Email
                          </th>

                          <th>
                            Department
                          </th>

                          <th>
                            Designation
                          </th>

                          <th>
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>

                        {employees.map(
                          (
                            employee,
                            index
                          ) => (
                            <tr
                              key={`${employee.id}-${index}`}
                            >

                              <td>
                                <span className="employee-id">
                                  {employee.id}
                                </span>
                              </td>

                              <td>
                                <div className="employee-name-cell">

                                  <div className="employee-avatar">
                                    {(
                                      employee.name !==
                                      "N/A"
                                        ? employee.name
                                        : "E"
                                    )
                                      .charAt(
                                        0
                                      )
                                      .toUpperCase()}
                                  </div>

                                  <strong>
                                    {
                                      employee.name
                                    }
                                  </strong>

                                </div>
                              </td>

                              <td>
                                <span className="email-text">
                                  {
                                    employee.email
                                  }
                                </span>
                              </td>

                              <td>
                                {
                                  employee.department
                                }
                              </td>

                              <td>
                                {
                                  employee.designation
                                }
                              </td>

                              <td>

                                <span
                                  className={
                                    employee.status ===
                                      "N/A"
                                      ? "status-badge neutral"
                                      : "status-badge"
                                  }
                                >
                                  {employee.status}
                                </span>

                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>
              )}

            </section>
          )}

          {/* =================================================
              USERS
          ================================================= */}

          {currentPage ===
            "users" && (
            <section className="page-content">

              <div className="section-header">

                <div>
                  <div className="eyebrow">
                    ADMINISTRATION
                  </div>

                  <h2>
                    User Management
                  </h2>

                  <p>
                    Manage portal users and
                    their active status.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={() =>
                    setShowCreateUser(
                      true
                    )
                  }
                >
                  + Create User
                </button>

              </div>

              {loading ? (
                <div className="loading-card">
                  Loading users...
                </div>
              ) : (
                <div className="employee-table-card">

                  <div className="table-scroll">

                    <table className="data-table">

                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>

                        {users.length ===
                        0 ? (
                          <tr>
                            <td
                              colSpan="6"
                              className="table-empty"
                            >
                              No users found.
                            </td>
                          </tr>
                        ) : (
                          users.map(
                            (item) => (
                              <tr
                                key={
                                  item.id
                                }
                              >

                                <td>
                                  {
                                    item.id
                                  }
                                </td>

                                <td>
                                  <strong>
                                    {
                                      item.name
                                    }
                                  </strong>
                                </td>

                                <td>
                                  {
                                    item.email
                                  }
                                </td>

                                <td>
                                  <span className="role-badge">
                                    {
                                      item.role
                                    }
                                  </span>
                                </td>

                                <td>
                                  <span
                                    className={
                                      item.is_active
                                        ? "status-badge"
                                        : "status-badge inactive"
                                    }
                                  >
                                    {item.is_active
                                      ? "Active"
                                      : "Inactive"}
                                  </span>
                                </td>

                                <td>
                                  <button
                                    className="small-button"
                                    onClick={() =>
                                      updateUserStatus(
                                        item.id,
                                        item.is_active
                                      )
                                    }
                                  >
                                    {item.is_active
                                      ? "Deactivate"
                                      : "Activate"}
                                  </button>
                                </td>

                              </tr>
                            )
                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>
              )}

            </section>
          )}

          {/* =================================================
              ROLES
          ================================================= */}

          {currentPage ===
            "roles" && (
            <section className="page-content">

              <div className="section-header">

                <div>
                  <div className="eyebrow">
                    ADMINISTRATION
                  </div>

                  <h2>
                    Role Management
                  </h2>

                  <p>
                    Create roles and manage
                    their permissions.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={() =>
                    setShowCreateRole(
                      true
                    )
                  }
                >
                  + Create Role
                </button>

              </div>

              <div className="roles-layout">

                <div className="employee-table-card">

                  <div className="table-scroll">

                    <table className="data-table">

                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Role</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>

                        {roles.map(
                          (role) => (
                            <tr
                              key={
                                role.id
                              }
                            >

                              <td>
                                {
                                  role.id
                                }
                              </td>

                              <td>
                                <strong>
                                  {
                                    role.name
                                  }
                                </strong>
                              </td>

                              <td>
                                <button
                                  className="small-button"
                                  onClick={() =>
                                    loadRolePermissions(
                                      role.id
                                    )
                                  }
                                >
                                  View Permissions
                                </button>
                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>

                <div className="panel">

                  <div className="panel-header">
                    <div>
                      <h3>
                        {selectedRole
                          ? `${selectedRole.name} Permissions`
                          : "Role Permissions"}
                      </h3>

                      <p>
                        View and assign
                        permissions
                      </p>
                    </div>
                  </div>

                  {!selectedRole ? (
                    <div className="muted">
                      Select a role to view
                      its permissions.
                    </div>
                  ) : (
                    <>
                      {rolePermissions.length ===
                      0 ? (
                        <div className="empty-small">
                          No permissions
                          assigned.
                        </div>
                      ) : (
                        <div className="permission-list">
                          {rolePermissions.map(
                            (
                              permission
                            ) => (
                              <div
                                className="permission-item"
                                key={
                                  permission.id
                                }
                              >
                                ✓{" "}
                                {
                                  permission.name
                                }
                              </div>
                            )
                          )}
                        </div>
                      )}

                      <div className="assign-box">

                        <h4>
                          Assign Permission
                        </h4>

                        <select
                          defaultValue=""
                          onChange={(
                            event
                          ) => {
                            if (
                              event.target
                                .value
                            ) {
                              assignPermission(
                                event
                                  .target
                                  .value
                              );

                              event.target.value =
                                "";
                            }
                          }}
                        >
                          <option value="">
                            Select permission
                          </option>

                          {permissions.map(
                            (
                              permission
                            ) => (
                              <option
                                key={
                                  permission.id
                                }
                                value={
                                  permission.id
                                }
                              >
                                {
                                  permission.name
                                }
                              </option>
                            )
                          )}
                        </select>

                      </div>
                    </>
                  )}

                </div>

              </div>

            </section>
          )}

          {/* =================================================
              PERMISSIONS
          ================================================= */}

          {currentPage ===
            "permissions" && (
            <section className="page-content">

              <div className="section-header">

                <div>
                  <div className="eyebrow">
                    ADMINISTRATION
                  </div>

                  <h2>
                    Permission Management
                  </h2>

                  <p>
                    Manage available system
                    permissions.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={() =>
                    setShowCreatePermission(
                      true
                    )
                  }
                >
                  + Create Permission
                </button>

              </div>

              <div className="employee-table-card">

                <div className="table-scroll">

                  <table className="data-table">

                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>
                          Permission Name
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {permissions.map(
                        (
                          permission
                        ) => (
                          <tr
                            key={
                              permission.id
                            }
                          >

                            <td>
                              {
                                permission.id
                              }
                            </td>

                            <td>
                              <span className="permission-badge">
                                {
                                  permission.name
                                }
                              </span>
                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </section>
          )}

          {/* =================================================
              AUDIT LOGS
          ================================================= */}

          {currentPage ===
            "audit" && (
            <section className="page-content">

              <div className="section-header">

                <div>
                  <div className="eyebrow">
                    ADMINISTRATION
                  </div>

                  <h2>
                    Audit Logs
                  </h2>

                  <p>
                    Track important actions
                    performed in the
                    portal.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={
                    loadAuditLogs
                  }
                >
                  ↻ Refresh Logs
                </button>

              </div>

              {loading ? (
                <div className="loading-card">
                  Loading audit logs...
                </div>
              ) : auditLogs.length ===
                0 ? (
                <div className="empty-card">
                  <div className="empty-icon">
                    ▤
                  </div>

                  <h3>
                    No audit logs
                  </h3>

                  <p>
                    No audit activity
                    has been recorded
                    yet.
                  </p>
                </div>
              ) : (
                <div className="employee-table-card">

                  <div className="table-scroll">

                    <table className="data-table">

                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Action</th>
                          <th>Details</th>
                          <th>User</th>
                          <th>Date</th>
                        </tr>
                      </thead>

                      <tbody>

                        {auditLogs.map(
                          (log) => (
                            <tr
                              key={
                                log.id
                              }
                            >

                              <td>
                                {
                                  log.id
                                }
                              </td>

                              <td>
                                <span className="role-badge">
                                  {
                                    log.action
                                  }
                                </span>
                              </td>

                              <td>
                                {
                                  log.details
                                }
                              </td>

                              <td>
                                {log.user_name ||
                                  log.user_email ||
                                  "N/A"}
                              </td>

                              <td>
                                {log.created_at
                                  ? new Date(
                                      log.created_at
                                    ).toLocaleString()
                                  : "N/A"}
                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>
              )}

            </section>
          )}

        </main>

        {/* ===================================================
            CREATE USER MODAL
        =================================================== */}

        {showCreateUser && (
          <div className="modal-overlay">

            <div className="modal">

              <div className="modal-header">

                <div>
                  <h2>
                    Create User
                  </h2>

                  <p>
                    Add a new portal
                    user.
                  </p>
                </div>

                <button
                  className="modal-close"
                  onClick={() =>
                    setShowCreateUser(
                      false
                    )
                  }
                >
                  ×
                </button>

              </div>

              <form
                onSubmit={createUser}
                className="modal-form"
              >

                <label>
                  Name
                </label>

                <input
                  type="text"
                  value={
                    newUser.name
                  }
                  onChange={(event) =>
                    setNewUser({
                      ...newUser,
                      name:
                        event.target
                          .value,
                    })
                  }
                  required
                />

                <label>
                  Email
                </label>

                <input
                  type="email"
                  value={
                    newUser.email
                  }
                  onChange={(event) =>
                    setNewUser({
                      ...newUser,
                      email:
                        event.target
                          .value,
                    })
                  }
                  required
                />

                <label>
                  Password
                </label>

                <input
                  type="password"
                  value={
                    newUser.password
                  }
                  onChange={(event) =>
                    setNewUser({
                      ...newUser,
                      password:
                        event.target
                          .value,
                    })
                  }
                  required
                />

                <label>
                  Role
                </label>

                <select
                  value={
                    newUser.role
                  }
                  onChange={(event) =>
                    setNewUser({
                      ...newUser,
                      role:
                        event.target
                          .value,
                    })
                  }
                  required
                >
                  <option value="">
                    Select Role
                  </option>

                  {roles.map(
                    (role) => (
                      <option
                        key={
                          role.id
                        }
                        value={
                          role.name
                        }
                      >
                        {
                          role.name
                        }
                      </option>
                    )
                  )}
                </select>

                <button
                  type="submit"
                  className="primary-button full-width"
                  disabled={loading}
                >
                  {loading
                    ? "Creating..."
                    : "Create User"}
                </button>

              </form>

            </div>

          </div>
        )}

        {/* ===================================================
            CREATE ROLE MODAL
        =================================================== */}

        {showCreateRole && (
          <div className="modal-overlay">

            <div className="modal small-modal">

              <div className="modal-header">

                <div>
                  <h2>
                    Create Role
                  </h2>

                  <p>
                    Add a new system
                    role.
                  </p>
                </div>

                <button
                  className="modal-close"
                  onClick={() =>
                    setShowCreateRole(
                      false
                    )
                  }
                >
                  ×
                </button>

              </div>

              <form
                onSubmit={createRole}
                className="modal-form"
              >

                <label>
                  Role Name
                </label>

                <input
                  type="text"
                  value={
                    newRole
                  }
                  onChange={(event) =>
                    setNewRole(
                      event.target
                        .value
                    )
                  }
                  placeholder="Example: HR"
                  required
                />

                <button
                  type="submit"
                  className="primary-button full-width"
                >
                  Create Role
                </button>

              </form>

            </div>

          </div>
        )}

        {/* ===================================================
            CREATE PERMISSION MODAL
        =================================================== */}

        {showCreatePermission && (
          <div className="modal-overlay">

            <div className="modal small-modal">

              <div className="modal-header">

                <div>
                  <h2>
                    Create Permission
                  </h2>

                  <p>
                    Add a system
                    permission.
                  </p>
                </div>

                <button
                  className="modal-close"
                  onClick={() =>
                    setShowCreatePermission(
                      false
                    )
                  }
                >
                  ×
                </button>

              </div>

              <form
                onSubmit={
                  createPermission
                }
                className="modal-form"
              >

                <label>
                  Permission Name
                </label>

                <input
                  type="text"
                  value={
                    newPermission
                  }
                  onChange={(event) =>
                    setNewPermission(
                      event.target
                        .value
                    )
                  }
                  placeholder="Example: view_reports"
                  required
                />

                <button
                  type="submit"
                  className="primary-button full-width"
                >
                  Create Permission
                </button>

              </form>

            </div>

          </div>
        )}

      </div>
    </>
  );
}

// ===========================================================
// COMPLETE PORTAL STYLES
// ===========================================================

const GLOBAL_STYLES = `
* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  min-height: 100%;
  width: 100%;
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  background: #f4f7fb;
  color: #172033;
}

button,
input,
select {
  font-family: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

/* =========================================================
   LOGIN
========================================================= */

.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
  background:
    radial-gradient(
      circle at top left,
      #dce9ff 0,
      transparent 35%
    ),
    linear-gradient(
      135deg,
      #f7faff 0%,
      #edf3fb 100%
    );
}

.login-card {
  width: 100%;
  max-width: 460px;
  background: #ffffff;
  border: 1px solid #e3e9f2;
  border-radius: 20px;
  padding: 42px;
  box-shadow:
    0 25px 70px rgba(31, 52, 89, 0.12);
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 38px;
}

.logo-circle {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(
    135deg,
    #2166f3,
    #5b8cff
  );
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25px;
  font-weight: 800;
  box-shadow:
    0 8px 20px rgba(33, 102, 243, 0.25);
}

.logo-circle.small {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 11px;
  font-size: 20px;
}

.brand-title {
  font-size: 17px;
  font-weight: 750;
  color: #172033;
}

.brand-subtitle {
  margin-top: 3px;
  color: #7b879b;
  font-size: 12px;
}

.login-heading {
  font-size: 30px;
  font-weight: 750;
  color: #172033;
}

.login-description {
  color: #77839a;
  margin: 8px 0 28px;
  font-size: 15px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.login-form label,
.modal-form label {
  color: #34425a;
  font-size: 13px;
  font-weight: 650;
  margin-top: 8px;
}

.login-form input,
.modal-form input,
.modal-form select,
.assign-box select {
  width: 100%;
  border: 1px solid #d7deea;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 14px;
  outline: none;
  background: #ffffff;
  color: #1b2639;
  transition: 0.2s;
}

.login-form input:focus,
.modal-form input:focus,
.modal-form select:focus,
.assign-box select:focus {
  border-color: #3775ed;
  box-shadow:
    0 0 0 3px rgba(55, 117, 237, 0.1);
}

.primary-button {
  border: 0;
  border-radius: 9px;
  background: #2166f3;
  color: #ffffff;
  padding: 11px 18px;
  font-size: 13px;
  font-weight: 700;
  transition: 0.2s;
  box-shadow:
    0 5px 14px rgba(33, 102, 243, 0.18);
}

.primary-button:hover {
  background: #1658d7;
  transform: translateY(-1px);
}

.login-button {
  margin-top: 18px;
  width: 100%;
  padding: 13px;
  font-size: 14px;
}

.full-width {
  width: 100%;
}

.login-footer {
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px solid #edf0f5;
  text-align: center;
  color: #99a3b3;
  font-size: 12px;
}

/* =========================================================
   LAYOUT
========================================================= */

.portal-layout {
  min-height: 100vh;
  display: flex;
  background: #f4f7fb;
}

.sidebar {
  width: 260px;
  min-height: 100vh;
  background: #111a2b;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  padding: 22px 14px;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 3px 9px 26px;
  border-bottom: 1px solid
    rgba(255,255,255,0.08);
}

.sidebar-brand-title {
  font-size: 14px;
  font-weight: 750;
}

.sidebar-brand-subtitle {
  font-size: 11px;
  color: #8390a7;
  margin-top: 3px;
}

.sidebar-user {
  margin: 20px 4px;
  padding: 13px;
  background: rgba(255,255,255,0.055);
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 11px;
}

.user-avatar,
.topbar-avatar,
.employee-avatar,
.profile-avatar {
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    #3775ed,
    #7957e9
  );
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 750;
}

.user-avatar {
  width: 38px;
  height: 38px;
  min-width: 38px;
}

.sidebar-user-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-user-info strong {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-user-info span {
  font-size: 11px;
  color: #8f9bb0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-user-info small {
  color: #68a1ff;
  font-size: 10px;
  font-weight: 650;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.nav-button {
  border: 0;
  background: transparent;
  color: #aeb8c9;
  width: 100%;
  text-align: left;
  padding: 11px 13px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 550;
  display: flex;
  align-items: center;
  gap: 11px;
  transition: 0.2s;
}

.nav-button span {
  width: 18px;
  text-align: center;
  font-size: 15px;
}

.nav-button:hover {
  background: rgba(255,255,255,0.07);
  color: #ffffff;
}

.nav-button.active {
  background: #2166f3;
  color: #ffffff;
  box-shadow:
    0 5px 14px rgba(33,102,243,0.22);
}

.nav-section-title {
  margin: 21px 11px 7px;
  font-size: 9px;
  letter-spacing: 1.3px;
  color: #68758d;
  font-weight: 750;
}

.logout-button {
  margin-top: auto;
  border: 1px solid
    rgba(255,255,255,0.09);
  background: rgba(255,255,255,0.045);
  color: #c1c9d7;
  border-radius: 9px;
  padding: 11px 13px;
  text-align: left;
  font-size: 13px;
}

.logout-button:hover {
  background: rgba(220, 70, 70, 0.16);
  color: #ffffff;
}

.main-area {
  margin-left: 260px;
  width: calc(100% - 260px);
  min-height: 100vh;
}

.topbar {
  height: 82px;
  background: #ffffff;
  border-bottom: 1px solid #e4e9f1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 34px;
}

.breadcrumb {
  color: #8c97a8;
  font-size: 11px;
  margin-bottom: 4px;
}

.topbar h1 {
  margin: 0;
  font-size: 22px;
  color: #172033;
  font-weight: 750;
}

.topbar-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topbar-avatar {
  width: 34px;
  height: 34px;
  font-size: 13px;
}

.topbar-user div:last-child {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.topbar-user strong {
  font-size: 12px;
}

.topbar-user span {
  font-size: 10px;
  color: #8994a7;
}

.page-content {
  padding: 30px 34px 50px;
  max-width: 1500px;
}

/* =========================================================
   GENERAL CARDS
========================================================= */

.welcome-card {
  background: linear-gradient(
    110deg,
    #1e5edc,
    #3877eb
  );
  color: #ffffff;
  border-radius: 16px;
  padding: 28px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow:
    0 12px 30px rgba(33,102,243,0.18);
}

.eyebrow {
  font-size: 10px;
  letter-spacing: 1.2px;
  font-weight: 750;
  color: #738198;
  margin-bottom: 6px;
}

.welcome-card .eyebrow {
  color: rgba(255,255,255,0.7);
}

.welcome-card h2 {
  margin: 0;
  font-size: 24px;
}

.welcome-card p {
  margin: 8px 0 0;
  color: rgba(255,255,255,0.82);
  font-size: 13px;
}

.welcome-role {
  padding: 8px 14px;
  border-radius: 20px;
  background: rgba(255,255,255,0.14);
  font-size: 12px;
  font-weight: 700;
}

.stats-grid {
  margin-top: 22px;
  display: grid;
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  background: #ffffff;
  border: 1px solid #e4e9f1;
  border-radius: 13px;
  padding: 20px;
  display: flex;
  gap: 14px;
  align-items: center;
}

.stat-icon {
  width: 43px;
  height: 43px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.stat-icon.blue {
  background: #eaf1ff;
  color: #2166f3;
}

.stat-icon.green {
  background: #e8f8f0;
  color: #1aa66d;
}

.stat-icon.purple {
  background: #f1ebff;
  color: #7750d8;
}

.stat-icon.orange {
  background: #fff3e5;
  color: #e58b28;
}

.stat-card div:last-child {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat-card span {
  font-size: 11px;
  color: #8490a3;
}

.stat-card strong {
  font-size: 23px;
  color: #172033;
}

.dashboard-grid {
  margin-top: 20px;
  display: grid;
  grid-template-columns:
    1.2fr 1fr;
  gap: 20px;
}

.panel,
.employee-table-card,
.profile-card {
  background: #ffffff;
  border: 1px solid #e3e8f0;
  border-radius: 14px;
  overflow: hidden;
}

.panel {
  padding: 23px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.panel-header h3 {
  margin: 0;
  font-size: 15px;
}

.panel-header p {
  margin: 5px 0 0;
  color: #8994a7;
  font-size: 11px;
}

.feature-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 11px;
}

.feature-list div {
  padding: 11px;
  border-radius: 8px;
  background: #f7f9fc;
  color: #536075;
  font-size: 12px;
}

.feature-list span {
  color: #1da56c;
  font-weight: 800;
  margin-right: 7px;
}

.account-row {
  display: flex;
  justify-content: space-between;
  padding: 13px 0;
  border-bottom: 1px solid #eef1f5;
  font-size: 12px;
}

.account-row:last-child {
  border-bottom: 0;
}

.account-row span {
  color: #8994a7;
}

.status-active {
  color: #159965 !important;
}

/* =========================================================
   SECTION HEADER
========================================================= */

.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
}

.section-header h2 {
  margin: 0;
  font-size: 24px;
}

.section-header p {
  margin: 6px 0 0;
  color: #8792a5;
  font-size: 13px;
}

/* =========================================================
   EMPLOYEE DIRECTORY
========================================================= */

.employee-summary {
  background: #ffffff;
  border: 1px solid #e3e8f0;
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.employee-summary > div:first-child {
  display: flex;
  align-items: center;
  gap: 9px;
}

.employee-summary strong {
  font-size: 18px;
  color: #2166f3;
}

.employee-summary span {
  color: #7d899c;
  font-size: 12px;
}

.connection-status {
  color: #1a9766 !important;
  font-size: 11px !important;
  font-weight: 650;
  display: flex;
  align-items: center;
  gap: 6px;
}

.online-dot {
  width: 7px;
  height: 7px;
  background: #22b573;
  border-radius: 50%;
}

.table-header {
  padding: 19px 20px;
  border-bottom: 1px solid #e8edf3;
}

.table-header h3 {
  margin: 0;
  font-size: 14px;
}

.table-header span {
  display: block;
  color: #8994a7;
  font-size: 11px;
  margin-top: 4px;
}

.table-scroll {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}

.data-table th {
  background: #f8fafc;
  color: #66738a;
  font-size: 11px;
  text-align: left;
  font-weight: 750;
  padding: 14px 17px;
  border-bottom: 1px solid #e3e8f0;
  white-space: nowrap;
}

.data-table td {
  padding: 15px 17px;
  border-bottom: 1px solid #edf0f4;
  color: #39465b;
  font-size: 12px;
  vertical-align: middle;
}

.data-table tbody tr:hover {
  background: #fafcff;
}

.data-table tbody tr:last-child td {
  border-bottom: 0;
}

.employee-id {
  font-weight: 700;
  color: #2166f3;
}

.employee-name-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}

.employee-avatar {
  width: 30px;
  height: 30px;
  min-width: 30px;
  font-size: 11px;
}

.email-text {
  color: #617087;
}

.status-badge,
.role-badge,
.permission-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 20px;
  padding: 5px 9px;
  font-size: 10px;
  font-weight: 700;
}

.status-badge {
  background: #e8f8f0;
  color: #168c5d;
}

.status-badge.neutral {
  background: #f0f2f5;
  color: #69758a;
}

.status-badge.inactive {
  background: #fff0f0;
  color: #cf5151;
}

.role-badge {
  background: #edf2ff;
  color: #4169c9;
}

.permission-badge {
  background: #f0ebff;
  color: #7752ca;
}

.small-button {
  border: 1px solid #d6deea;
  background: #ffffff;
  color: #3d4d65;
  border-radius: 7px;
  padding: 7px 10px;
  font-size: 10px;
  font-weight: 650;
}

.small-button:hover {
  border-color: #2166f3;
  color: #2166f3;
}

.table-empty {
  text-align: center !important;
  padding: 35px !important;
  color: #8994a7 !important;
}

/* =========================================================
   PROFILE
========================================================= */

.profile-card {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px;
  text-align: center;
}

.profile-avatar {
  width: 82px;
  height: 82px;
  margin: 0 auto 16px;
  font-size: 28px;
}

.profile-card h2 {
  margin: 0;
  font-size: 24px;
}

.profile-card > p {
  color: #8591a4;
  margin: 7px 0 28px;
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid #edf0f4;
}

.profile-grid div {
  padding: 17px;
  border-bottom: 1px solid #edf0f4;
}

.profile-grid span {
  display: block;
  color: #8a95a7;
  font-size: 11px;
  margin-bottom: 5px;
}

.profile-grid strong {
  font-size: 13px;
}

/* =========================================================
   ROLES
========================================================= */

.roles-layout {
  display: grid;
  grid-template-columns:
    1.4fr 0.8fr;
  gap: 20px;
}

.permission-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.permission-item {
  padding: 10px 12px;
  background: #f4f8ff;
  color: #3563bd;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.assign-box {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid #edf0f4;
}

.assign-box h4 {
  margin: 0 0 10px;
  font-size: 12px;
}

.muted,
.empty-small {
  color: #8994a7;
  font-size: 12px;
}

.empty-small {
  background: #f8f9fb;
  padding: 13px;
  border-radius: 8px;
}

/* =========================================================
   LOADING / EMPTY
========================================================= */

.loading-card,
.empty-card {
  background: #ffffff;
  border: 1px solid #e3e8f0;
  border-radius: 14px;
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #66738a;
}

.loading-card strong,
.empty-card h3 {
  color: #34425a;
  margin: 4px 0;
}

.loading-card span,
.empty-card p {
  font-size: 12px;
  color: #909bad;
}

.loader {
  width: 30px;
  height: 30px;
  border: 3px solid #e0e8f7;
  border-top-color: #2166f3;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #eef3ff;
  color: #4774d5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

/* =========================================================
   ERROR
========================================================= */

.error-box {
  background: #fff1f1;
  color: #bd4d4d;
  border: 1px solid #ffd4d4;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12px;
}

.page-error {
  margin: 20px 34px 0;
  padding: 11px 14px;
  border-radius: 9px;
  background: #fff1f1;
  border: 1px solid #ffd5d5;
  color: #b84d4d;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-error button {
  border: 0;
  background: transparent;
  color: #b84d4d;
  font-size: 18px;
}

/* =========================================================
   MODALS
========================================================= */

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(13, 24, 43, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 100;
}

.modal {
  width: 100%;
  max-width: 500px;
  background: #ffffff;
  border-radius: 15px;
  box-shadow:
    0 30px 80px rgba(0,0,0,0.2);
  overflow: hidden;
}

.small-modal {
  max-width: 420px;
}

.modal-header {
  padding: 21px 23px;
  border-bottom: 1px solid #e9edf3;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.modal-header h2 {
  margin: 0;
  font-size: 17px;
}

.modal-header p {
  margin: 5px 0 0;
  color: #8a95a7;
  font-size: 11px;
}

.modal-close {
  border: 0;
  background: #f2f4f7;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  font-size: 19px;
  color: #6f7a8d;
}

.modal-form {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 1050px) {
  .sidebar {
    width: 220px;
  }

  .main-area {
    margin-left: 220px;
    width: calc(100% - 220px);
  }

  .stats-grid {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .dashboard-grid,
  .roles-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 750px) {
  .sidebar {
    width: 70px;
    padding: 15px 9px;
  }

  .sidebar-brand > div:last-child,
  .sidebar-user-info,
  .nav-button:not(.active)::after,
  .nav-button,
  .nav-section-title {
    font-size: 0;
  }

  .sidebar-brand {
    justify-content: center;
    padding: 4px 0 20px;
  }

  .sidebar-user {
    justify-content: center;
    padding: 8px;
  }

  .nav-button {
    justify-content: center;
    padding: 12px;
  }

  .nav-button span {
    font-size: 16px;
  }

  .logout-button {
    font-size: 0;
    text-align: center;
  }

  .logout-button span {
    font-size: 16px;
  }

  .main-area {
    margin-left: 70px;
    width: calc(100% - 70px);
  }

  .topbar {
    padding: 0 18px;
  }

  .page-content {
    padding: 20px 18px 40px;
  }

  .topbar-user {
    display: none;
  }

  .welcome-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .feature-list,
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 15px;
  }

  .employee-summary {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }
}
`;

export default App;