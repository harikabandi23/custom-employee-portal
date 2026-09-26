require("dotenv").config();

const axios = require("axios");

async function test() {
  try {
    console.log("Testing Zoho refresh directly...");

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

    console.log("STATUS:", response.status);
    console.log("RESPONSE:", response.data);

  } catch (error) {
    console.log("STATUS:", error.response?.status);
    console.log("RESPONSE:", error.response?.data);
  }
}

test();