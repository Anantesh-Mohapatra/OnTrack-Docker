// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const FormData = require("form-data");

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

app.post("/api/train-data", async (req, res) => {
  // Proxies requests to the NJ Transit API so the token isn't exposed to clients
  const { trainNumber } = req.body;
  if (!trainNumber) {
    return res.status(400).json({ message: "trainNumber is required" });
  }

  try {
    const formData = new FormData();
    formData.append("token", process.env.REACT_APP_NJTRANSIT_API_KEY);
    formData.append("train", trainNumber);

    const response = await fetch(
      "https://raildata.njtransit.com/api/TrainData/getTrainStopList",
      {
        method: "POST",
        body: formData,
      }
    );

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      res.json(data);
    } catch (parseErr) {
      console.error("Invalid JSON from NJ Transit:", text);
      res.status(500).json({ message: "Invalid response from NJ Transit" });
    }
  } catch (err) {
    console.error("Error fetching train data:", err);
    res.status(500).json({ message: "Failed to fetch train data" });
  }
});

const PORT = process.env.PORT || 5000; // Default to 5000 if PORT is not set
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
