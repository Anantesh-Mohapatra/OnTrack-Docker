// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { URLSearchParams } = require("url");

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

app.post("/api/train-data", async (req, res) => {
  // Proxies requests to the NJ Transit API so the token isn't exposed to clients
  const { trainNumber } = req.body;
  if (!trainNumber) {
    return res.status(400).json({ errorMessage: "trainNumber is required" });
  }

  try {
    const token = process.env.REACT_APP_NJTRANSIT_API_KEY;
    if (!token) {
      console.error("NJ Transit API key is not configured");
      return res
        .status(500)
        .json({ errorMessage: "NJ Transit API key is not configured" });
    }

    const params = new URLSearchParams();
    params.append("token", token);
    params.append("train", trainNumber);

    const response = await fetch(
      "https://raildata.njtransit.com/api/TrainData/getTrainStopList",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: params,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response from NJ Transit:", errorText);
      return res
        .status(500)
        .json({ errorMessage: "Failed to fetch train data" });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const errorText = await response.text();
      console.error("Invalid JSON from NJ Transit:", errorText);
      return res
        .status(500)
        .json({ errorMessage: "Invalid response from NJ Transit" });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error fetching train data:", err);
    res.status(500).json({ errorMessage: "Failed to fetch train data" });
  }
});

const PORT = process.env.PORT || 5000; // Default to 5000 if PORT is not set
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
