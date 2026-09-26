const axios = require("axios");
const { getZohoAccessToken } = require("./zohoAuthService");

async function zohoApiRequest({
  method = "GET",
  url,
  params = {},
  data = {}
}) {
  try {
    const accessToken = await getZohoAccessToken();

    const response = await axios({
      method,
      url,
      params,
      data,
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error(
      "Zoho API request error:",
      error.response?.data || error.message
    );

    throw new Error("Zoho API request failed");
  }
}

module.exports = {
  zohoApiRequest
};