const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Temporary server works"
  });
});

const server = app.listen(5000, "127.0.0.1", () => {
  console.log("TEMP SERVER STARTED");
  console.log("Server address:", server.address());
});

server.on("error", (error) => {
  console.error("SERVER ERROR:", error);
});

setInterval(() => {
  console.log("TEMP SERVER STILL RUNNING");
}, 5000);
