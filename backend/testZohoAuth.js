require("dotenv").config();

console.log("Starting Zoho authentication test...");

console.log("Client ID loaded:", Boolean(process.env.ZOHO_CLIENT_ID));
console.log("Client Secret loaded:", Boolean(process.env.ZOHO_CLIENT_SECRET));
console.log("Refresh Token loaded:", Boolean(process.env.ZOHO_REFRESH_TOKEN));

console.log(
  "Client ID length:",
  process.env.ZOHO_CLIENT_ID?.length
);

console.log(
  "Client Secret length:",
  process.env.ZOHO_CLIENT_SECRET?.length
);

console.log(
  "Refresh Token length:",
  process.env.ZOHO_REFRESH_TOKEN?.length
);

console.log(
  "Refresh Token starts with:",
  process.env.ZOHO_REFRESH_TOKEN?.substring(0, 5)
);

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