// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors()); // Enable CORS for all routes

// Endpoint to return the API key
app.get("/api/key", (req, res) => {
  // Read the API key from environment variables
  const apiKey = process.env.REACT_APP_NJTRANSIT_API_KEY;

  // Send the API key as a JSON response
  res.json({ apiKey });
});

// Start the server
const PORT = process.env.PORT || 5000; // Default to 5000 if PORT is not set
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
