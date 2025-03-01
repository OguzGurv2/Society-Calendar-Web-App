import express from "express";
import * as db from "./database.js";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Load environment variables(port number) from .env file
dotenv.config();

// Define __dirname for ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "src")));

// Serve homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "index.html"));
});

// Fetch All Events
async function getEvents(req, res) {
    try {
        const events = await db.getAllEvents();
        res.status(200).json(events);
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ message: "Server error" });
    }
}

// Add Event
async function addEvent(req, res) {
    try {
        const { is_online, ...eventDetails } = req.body;
        const isOnline = is_online === "on" ? 1 : 0;

        const newEvent = { ...eventDetails, is_online: isOnline };
        const savedEvent = await db.addEvent(newEvent);

        res.status(200).json(savedEvent);
    } catch (error) {
        console.error("Error adding event:", error);
        res.status(500).json({ message: "Server error" });
    }
}

// Update Event
async function updateEvent(req, res) {
    try {
        const { is_online, ...eventDetails } = req.body;
        const isOnline = is_online === "true" ? 1 : 0;

        const updatedEvent = { ...eventDetails, is_online: isOnline };
        await db.updateEvent(updatedEvent);

        res.status(200).json(updatedEvent);
    } catch (error) {
        console.error("Error updating event:", error);
        res.status(500).json({ message: "Server error" });
    }
}

// Endpoints
app.get("/events", getEvents);
app.post("/addEvent", addEvent);
app.post("/updateEvent", updateEvent);

// Start Server
app.listen(PORT, () => console.log(`Server running at: http://localhost:${PORT}`));
