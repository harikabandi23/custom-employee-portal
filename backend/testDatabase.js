require("dotenv").config();

const { Client } = require("pg");

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  console.log("TEST_DATABASE_URL is missing from .env");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testDatabase() {
  try {
    await client.connect();

    const result = await client.query("SELECT NOW()");

    console.log("=================================");
    console.log("DATABASE CONNECTED SUCCESSFULLY!");
    console.log("Database time:", result.rows[0].now);
    console.log("=================================");
  } catch (error) {
    console.log("=================================");
    console.log("DATABASE CONNECTION FAILED");
    console.log("Message:", error.message);
    console.log("Code:", error.code);
    console.log("Host:", error.hostname);
    console.log("=================================");
  } finally {
    await client.end();
  }
}

testDatabase();