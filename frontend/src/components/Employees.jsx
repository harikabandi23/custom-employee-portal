import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:5000";

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getEmployees = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("employeePortalToken");

      if (!token) {
        setError("Authentication token not found. Please login again.");
        return;
      }

      const response = await fetch(`${API_URL}/api/zoho/people`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const result = await response.json();

      console.log("Zoho People frontend response:", result);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to retrieve employees"
        );
      }

      setEmployees(result.employees || []);

    } catch (error) {
      console.error("Employee fetch error:", error);
      setError(error.message || "Unable to retrieve employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getEmployees();
  }, []);

  if (loading) {
    return (
      <div className="employees-container">
        <h2>Employees</h2>
        <p>Loading employees...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="employees-container">
        <h2>Employees</h2>

        <div className="error-message">
          {error}
        </div>

        <button onClick={getEmployees}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="employees-container">

      <div className="employees-header">
        <h2>Employees</h2>

        <p>
          {employees.length} employees retrieved successfully
        </p>
      </div>

      {employees.length === 0 ? (
        <div className="empty-message">
          No employees found.
        </div>
      ) : (
        <div className="table-container">

          <table className="employees-table">

            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {employees.map((employee, index) => (

                <tr
                  key={
                    employee.employeeId ||
                    index
                  }
                >

                  <td>
                    <strong>
                      {employee.employeeId}
                    </strong>
                  </td>

                  <td>
                    {employee.name}
                  </td>

                  <td>
                    {employee.email}
                  </td>

                  <td>
                    {employee.department}
                  </td>

                  <td>
                    {employee.designation}
                  </td>

                  <td>
                    <span className="status-active">
                      {employee.status}
                    </span>
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>
      )}

    </div>
  );
}

export default Employees;