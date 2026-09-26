require("dotenv").config();

console.log("Starting Zoho authentication test...");

const { getZohoAccessToken } = require("./services/zohoAuthService");

async function testZohoAuth() {
  try {
    console.log("Requesting Zoho access token...");

    const accessToken = await getZohoAccessToken();

    console.log("SUCCESS: Zoho access token received.");
    console.log("Token received:", Boolean(accessToken));
  } catch (error) {
    console.error("FAILED:", error.message);
  }
}

testZohoAuth();