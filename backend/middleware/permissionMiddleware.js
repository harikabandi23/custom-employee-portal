const supabase = require("../config/supabase");

function requirePermission(permissionName) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          roles (
            role_permissions (
              permissions (
                name
              )
            )
          )
        `)
        .eq("user_id", req.user.userId);

      if (error) {
        console.error("=================================");
        console.error("PERMISSION SUPABASE ERROR");
        console.error("Message:", error.message);
        console.error("Code:", error.code);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
        console.error("=================================");

        return res.status(500).json({
          success: false,
          message: "Unable to verify permission"
        });
      }

      const hasPermission = data?.some((userRole) =>
        userRole.roles?.role_permissions?.some(
          (rolePermission) =>
            rolePermission.permissions?.name === permissionName
        )
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You do not have this permission."
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to verify permission"
      });
    }
  };
}

module.exports = requirePermission;