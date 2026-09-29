const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");
const { zohoApiRequest } = require("../services/zohoApiService");

const router = express.Router();

/*
=========================================================
UTILITY 1
NORMALIZE FIELD NAME
=========================================================

Examples:

"First Name"       -> "firstname"
"First_Name"       -> "firstname"
"firstName"        -> "firstname"
"FIRST NAME"       -> "firstname"
*/

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}


/*
=========================================================
UTILITY 2
CONVERT ZOHO NESTED VALUES TO TEXT
=========================================================

Zoho may return:

"HR"

or:

{
  value: "HR"
}

or:

{
  display_value: "HR"
}

or:

{
  name: "HR"
}
*/

function extractValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    const result = String(value).trim();

    return result !== "" ? result : null;
  }

  if (Array.isArray(value)) {
    const values = value
      .map((item) => extractValue(item))
      .filter(Boolean);

    return values.length > 0 ? values.join(", ") : null;
  }

  if (typeof value === "object") {
    const possibleKeys = [
      "value",
      "display_value",
      "displayValue",
      "name",
      "label",
      "text",
      "title",
      "email",
      "id"
    ];

    for (const key of possibleKeys) {
      if (
        value[key] !== undefined &&
        value[key] !== null
      ) {
        const extracted = extractValue(value[key]);

        if (extracted) {
          return extracted;
        }
      }
    }
  }

  return null;
}


/*
=========================================================
UTILITY 3
GET A FIELD USING EXACT/ALIAS NAMES
=========================================================
*/

function getField(record, possibleNames) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const normalizedNames = possibleNames.map(normalizeKey);

  for (const key of Object.keys(record)) {
    const normalizedKey = normalizeKey(key);

    if (normalizedNames.includes(normalizedKey)) {
      const value = extractValue(record[key]);

      if (value) {
        return value;
      }
    }
  }

  return null;
}


/*
=========================================================
UTILITY 4
SEARCH NESTED OBJECTS
=========================================================
*/

function getNestedField(record, possibleNames) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const normalizedNames = possibleNames.map(normalizeKey);

  function search(object) {
    if (!object || typeof object !== "object") {
      return null;
    }

    for (const key of Object.keys(object)) {
      const normalizedKey = normalizeKey(key);

      if (normalizedNames.includes(normalizedKey)) {
        const value = extractValue(object[key]);

        if (value) {
          return value;
        }
      }

      if (
        object[key] &&
        typeof object[key] === "object"
      ) {
        const nestedResult = search(object[key]);

        if (nestedResult) {
          return nestedResult;
        }
      }
    }

    return null;
  }

  return search(record);
}


/*
=========================================================
UTILITY 5
FUZZY FIELD SEARCH
=========================================================

Used when Zoho gives a slightly different field label.

Example:

"Employee Department"

will still match department.

"Official Email ID"

will still match email.
*/

function getFuzzyField(record, keywords) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const normalizedKeywords = keywords.map(normalizeKey);

  function search(object) {
    if (!object || typeof object !== "object") {
      return null;
    }

    for (const key of Object.keys(object)) {
      const normalizedKey = normalizeKey(key);

      const matches = normalizedKeywords.some((keyword) =>
        normalizedKey.includes(keyword)
      );

      if (matches) {
        const value = extractValue(object[key]);

        if (value) {
          return value;
        }
      }

      if (
        object[key] &&
        typeof object[key] === "object"
      ) {
        const nestedResult = search(object[key]);

        if (nestedResult) {
          return nestedResult;
        }
      }
    }

    return null;
  }

  return search(record);
}


/*
=========================================================
UTILITY 6
FIND EMAIL ANYWHERE IN RECORD
=========================================================
*/

function findEmail(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  /*
  First check known email fields.
  */

  const knownEmail = getNestedField(record, [
    "Email",
    "Email ID",
    "EmailID",
    "Email Id",
    "email",
    "email_id",
    "emailId",
    "Work Email",
    "Work Email ID",
    "WorkEmail",
    "WorkEmailID",
    "Official Email",
    "Official Email ID",
    "Employee Email",
    "EmployeeEmail"
  ]);

  if (
    knownEmail &&
    knownEmail.includes("@")
  ) {
    return knownEmail;
  }

  /*
  Search every string in the record.
  */

  function search(object) {
    if (!object || typeof object !== "object") {
      return null;
    }

    for (const key of Object.keys(object)) {
      const value = object[key];

      if (typeof value === "string") {
        const text = value.trim();

        if (
          text.includes("@") &&
          text.includes(".")
        ) {
          return text;
        }
      }

      if (
        value &&
        typeof value === "object"
      ) {
        const nestedResult = search(value);

        if (nestedResult) {
          return nestedResult;
        }
      }
    }

    return null;
  }

  return search(record);
}


/*
=========================================================
UTILITY 7
FIND EMPLOYEE RECORDS
=========================================================
*/

function findEmployeeRecords(data) {
  if (!data) {
    return [];
  }

  /*
  Direct array
  */

  if (Array.isArray(data)) {
    return data;
  }

  /*
  Your backend response structure
  */

  if (Array.isArray(data.employees)) {
    return data.employees;
  }

  /*
  Common Zoho structures
  */

  if (Array.isArray(data.data)) {
    return data.data;
  }

  if (Array.isArray(data.records)) {
    return data.records;
  }

  if (Array.isArray(data.result)) {
    return data.result;
  }

  if (Array.isArray(data.response)) {
    return data.response;
  }

  /*
  Nested structures
  */

  if (Array.isArray(data.data?.employees)) {
    return data.data.employees;
  }

  if (Array.isArray(data.data?.records)) {
    return data.data.records;
  }

  if (Array.isArray(data.data?.result)) {
    return data.data.result;
  }

  if (Array.isArray(data.response?.data)) {
    return data.response.data;
  }

  if (Array.isArray(data.response?.result)) {
    return data.response.result;
  }

  if (Array.isArray(data.response?.records)) {
    return data.response.records;
  }

  if (
    Array.isArray(
      data.response?.result?.records
    )
  ) {
    return data.response.result.records;
  }

  return [];
}


/*
=========================================================
GET ZOHO PEOPLE EMPLOYEES
=========================================================

GET /api/zoho/people
*/

router.get(
  "/people",
  authenticateToken,
  requirePermission("zoho_people"),

  async (req, res) => {
    try {
      console.log("");
      console.log("==========================================");
      console.log("ZOHO PEOPLE REQUEST STARTED");
      console.log("==========================================");

      /*
      ---------------------------------------------------
      CALL ZOHO PEOPLE
      ---------------------------------------------------
      */

      const data = await zohoApiRequest({
        method: "GET",
        url:
          "https://people.zoho.in/people/api/forms/employee/getRecords"
      });


      /*
      ---------------------------------------------------
      SHOW RAW RESPONSE
      ---------------------------------------------------
      */

      console.log("");
      console.log("========== RAW ZOHO RESPONSE ==========");

      console.dir(data, {
        depth: null
      });


      /*
      ---------------------------------------------------
      FIND EMPLOYEE RECORDS
      ---------------------------------------------------
      */

      const records = findEmployeeRecords(data);


      console.log("");
      console.log("==========================================");
      console.log(
        "EMPLOYEE RECORDS FOUND:",
        records.length
      );
      console.log("==========================================");


      /*
      ---------------------------------------------------
      IF NO RECORDS
      ---------------------------------------------------
      */

      if (records.length === 0) {
        return res.json({
          success: true,
          message: "0 employees retrieved successfully",
          count: 0,
          employees: []
        });
      }


      /*
      ---------------------------------------------------
      SHOW FIRST RAW RECORD
      ---------------------------------------------------
      */

      console.log("");
      console.log(
        "========== FIRST RAW EMPLOYEE =========="
      );

      console.dir(records[0], {
        depth: null
      });


      /*
      ---------------------------------------------------
      NORMALIZE EMPLOYEES
      ---------------------------------------------------
      */

      const employees = records.map(
        (record, index) => {

          console.log("");
          console.log(
            `========== EMPLOYEE ${index + 1} ==========`
          );


          /*
          ================================================
          EMPLOYEE ID
          ================================================
          */

          const employeeId =
            getNestedField(record, [
              "Employee ID",
              "EmployeeID",
              "Employee_ID",
              "employeeId",
              "employee_id",
              "Employee Number",
              "EmployeeNumber",
              "employeeNumber",
              "employee_number",
              "Zoho ID",
              "Zoho_ID",
              "zohoId",
              "recordId",
              "record_id",
              "ID",
              "id"
            ]) ||
            `EMP-${index + 1}`;


          /*
          ================================================
          FIRST NAME
          ================================================
          */

          const firstName =
            getNestedField(record, [
              "First Name",
              "FirstName",
              "First_Name",
              "firstName",
              "first_name",
              "firstname"
            ]);


          /*
          ================================================
          LAST NAME
          ================================================
          */

          const lastName =
            getNestedField(record, [
              "Last Name",
              "LastName",
              "Last_Name",
              "lastName",
              "last_name",
              "lastname"
            ]);


          /*
          ================================================
          FULL NAME
          ================================================
          */

          let name =
            getNestedField(record, [
              "Employee Name",
              "EmployeeName",
              "Employee_Name",
              "employeeName",
              "employee_name",
              "Full Name",
              "FullName",
              "fullName",
              "full_name",
              "Name",
              "name"
            ]);


          /*
          Build name from first + last name
          */

          if (!name) {
            name = `${firstName || ""} ${
              lastName || ""
            }`.trim();
          }


          /*
          ================================================
          EMAIL
          ================================================
          */

          let email = findEmail(record);


          /*
          ================================================
          DEPARTMENT
          ================================================
          */

          let department =
            getNestedField(record, [
              "Department",
              "Department Name",
              "DepartmentName",
              "Department_Name",
              "department",
              "departmentName",
              "department_name"
            ]);


          /*
          Fuzzy department fallback
          */

          if (!department) {
            department = getFuzzyField(
              record,
              [
                "department"
              ]
            );
          }


          /*
          ================================================
          DESIGNATION
          ================================================
          */

          let designation =
            getNestedField(record, [
              "Designation",
              "designation",
              "Job Title",
              "JobTitle",
              "Job_Title",
              "jobTitle",
              "job_title",
              "Title",
              "title"
            ]);


          /*
          Fuzzy designation fallback
          */

          if (!designation) {
            designation = getFuzzyField(
              record,
              [
                "designation",
                "jobtitle",
                "title"
              ]
            );
          }


          /*
          ================================================
          STATUS
          ================================================
          */

          let status =
            getNestedField(record, [
              "Employee Status",
              "EmployeeStatus",
              "Employee_Status",
              "employeeStatus",
              "employee_status",
              "Employeestatus",
              "Status",
              "status"
            ]);


          /*
          Fuzzy status fallback
          */

          if (!status) {
            status = getFuzzyField(
              record,
              [
                "status"
              ]
            );
          }


          /*
          ================================================
          FINAL VALUES
          ================================================
          */

          const employee = {
            employeeId: String(
              employeeId
            ),

            name: name
              ? String(name)
              : "N/A",

            email: email
              ? String(email)
              : "N/A",

            department: department
              ? String(department)
              : "N/A",

            designation: designation
              ? String(designation)
              : "N/A",

            status: status
              ? String(status)
              : "N/A",

            raw: record
          };


          /*
          ================================================
          DEBUG OUTPUT
          ================================================
          */

          console.log(
            "FINAL EMPLOYEE OBJECT:"
          );

          console.dir(employee, {
            depth: null
          });


          return employee;
        }
      );


      /*
      ---------------------------------------------------
      FINAL RESULT
      ---------------------------------------------------
      */

      console.log("");
      console.log("==========================================");
      console.log(
        "NORMALIZED EMPLOYEES:",
        employees.length
      );
      console.log("==========================================");

      console.log("");

      console.table(
        employees.map((employee) => ({
          EmployeeID:
            employee.employeeId,

          Name:
            employee.name,

          Email:
            employee.email,

          Department:
            employee.department,

          Designation:
            employee.designation,

          Status:
            employee.status
        }))
      );


      /*
      ---------------------------------------------------
      SEND RESPONSE TO FRONTEND
      ---------------------------------------------------
      */

      return res.json({
        success: true,

        message:
          `${employees.length} employees retrieved successfully`,

        count:
          employees.length,

        employees
      });

    } catch (error) {

      console.log("");
      console.log("==========================================");
      console.error(
        "ZOHO PEOPLE ERROR"
      );
      console.log("==========================================");

      console.error(error);

      console.log(
        "=========================================="
      );


      return res.status(500).json({
        success: false,

        message:
          "Unable to retrieve Zoho People employee records",

        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined
      });
    }
  }
);


module.exports = router;