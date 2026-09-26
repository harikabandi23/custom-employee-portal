require("dotenv").config();

const supabase = require("./config/supabase");

async function testSupabase() {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email")
      .limit(5);

    if (error) {
      console.log("=================================");
      console.log("SUPABASE CONNECTION FAILED");
      console.log("Message:", error.message);
      console.log("Code:", error.code);
      console.log("=================================");
      return;
    }

    console.log("=================================");
    console.log("SUPABASE CONNECTED SUCCESSFULLY!");
    console.log("Users found:", data);
    console.log("=================================");
  } catch (error) {
    console.log("=================================");
    console.log("SUPABASE TEST FAILED");
    console.log("Message:", error.message);
    console.log("=================================");
  }
}

testSupabase();