const axios = require("axios");

async function getZohoAccessToken() {
  try {
    const response = await axios.post(
      "https://accounts.zoho.in/oauth/v2/token",
      null,
      {
        params: {
          refresh_token: process.env.ZOHO_REFRESH_TOKEN,
          client_id: process.env.ZOHO_CLIENT_ID,
          client_secret: process.env.ZOHO_CLIENT_SECRET,
          grant_type: "refresh_token"
        }
      }
    );

    console.log("=================================");
    console.log("ZOHO OAUTH RESPONSE");
    console.log("Status:", response.status);
    console.log("Response keys:", Object.keys(response.data));
    console.log("Response:", response.data);
    console.log("=================================");

    if (!response.data.access_token) {
      throw new Error("Zoho access token was not returned");
    }

    console.log("Zoho access token generated successfully");

    return response.data.access_token;
  } catch (error) {
    console.error("=================================");
    console.error("ZOHO TOKEN REFRESH ERROR");
    console.error(
      "Response:",
      error.response?.data || error.message
    );
    console.error("=================================");

    throw new Error("Unable to generate Zoho access token");
  }
}

module.exports = {
  getZohoAccessToken
};