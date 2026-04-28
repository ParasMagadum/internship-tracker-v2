const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Internship Schema
const internshipSchema = new mongoose.Schema({
  company: String,
  role: String,
  status: { type: String, default: "Applied" },
  dateApplied: { type: Date, default: Date.now },
  notes: String,
});

const Internship = mongoose.model("Internship", internshipSchema);

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Internship Tracker API is running 🚀" });
});

// Get all internships
app.get("/api/internships", async (req, res) => {
  const internships = await Internship.find();
  res.json(internships);
});

// Add a new internship
app.post("/api/internships", async (req, res) => {
  const internship = new Internship(req.body);
  await internship.save();
  res.json(internship);
});

// Update an internship
app.put("/api/internships/:id", async (req, res) => {
  const internship = await Internship.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(internship);
});

// Delete an internship
app.delete("/api/internships/:id", async (req, res) => {
  await Internship.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted successfully" });
});

// Start server
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  }
}

startServer();