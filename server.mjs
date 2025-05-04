import express from "express";
import * as db from "./database.js";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";
import bcrypt from "bcrypt";
import ngrok from "ngrok";
import { createEvent } from "ics";

dotenv.config();

// Define __dirname for ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Render Login Page
async function renderLoginPage(req, res) {
  res.sendFile(path.join(__dirname, "src", "login.html"));
}

// Get User Details
async function getUser(req, res) {
  try {
    const { email, password } = req.body;
    let userData;
    if (email.endsWith("@upsu.net")) {
      userData = await db.getSocietyUser(email);
    } else {
      userData = await db.getStudentUser(email);
    }
    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }
    const isPasswordValid = await bcrypt.compare(
      password,
      userData.society_password || userData.student_password
    );
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }
    res.status(200).json({ message: "Login successful", user: userData });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// Logs Student User
async function logStudent(req, res) {
  res.sendFile(path.join(__dirname, "src", "index.html"));
}

// Logs Society User
async function logSociety(req, res) {
  res.sendFile(path.join(__dirname, "src", "index.html"));
}

// Fetch Events
async function getEvents(req, res) {
  try {
    const { userType, userId: id } = req.body;
    let events;
    if (userType === "society") {
      events = await db.getSocietyEvents(id);
    } else {
      events = await db.getStudentEvents(id);
    }
    res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// Add Event
async function addEvent(req, res) {
  try {
    const { is_online, repeat_event, ...eventDetails } = req.body;
    const isOnline = is_online === "on" ? 1 : 0;
    const newEvent = { ...eventDetails, is_online: isOnline };
    const savedEvent =
      repeat_event === "on"
        ? await db.addRecurringEvents(newEvent)
        : await db.addEvent(newEvent);
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
    const isOnline = is_online === "on" ? 1 : 0;
    const updatedEvent = { ...eventDetails, is_online: isOnline };
    await db.updateEvent(updatedEvent);
    res.status(200).json(updatedEvent);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// --- ICS Helpers ---
// Wrap createEvent in a Promise so we can use Promise.all
function createEventPromise(event) {
  return new Promise((resolve, reject) => {
    createEvent(event, (error, value) => {
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    });
  });
}

// Extract the VEVENT block from a full ICS string
function extractVeventBlock(icsString) {
  const lines = icsString.split(/\r?\n/);
  const startIndex = lines.indexOf("BEGIN:VEVENT");
  const endIndex = lines.indexOf("END:VEVENT");
  if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
    return lines.slice(startIndex, endIndex + 1).join("\r\n");
  }
  return "";
}

// Merge multiple VEVENT blocks into one VCALENDAR string
function mergeCalendarEvents(veventBlocks) {
  const header = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//YourApp//EN";
  const footer = "END:VCALENDAR";
  return header + "\r\n" + veventBlocks.join("\r\n") + "\r\n" + footer;
}

// Download Events as ICS using createEvent for each event
async function downloadEvents(req, res) {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ message: "No events provided" });
    }
    // Generate ICS for each event with createEvent
    let eventPromises = events.map(event => createEventPromise(event));
    let icsStrings;
    try {
      icsStrings = await Promise.all(eventPromises);
    } catch (err) {
      console.error("Error generating individual ICS events:", err);
      return res.status(500).json({ message: "ICS generation failed" });
    }
    // Extract VEVENT blocks and filter out empty ones
    const veventBlocks = icsStrings
      .map(str => extractVeventBlock(str))
      .filter(block => block && block.length > 0);
    if (veventBlocks.length === 0) {
      return res.status(400).json({ message: "No valid events generated" });
    }
    // Merge all VEVENT blocks into one calendar
    const mergedICS = mergeCalendarEvents(veventBlocks);
    res.setHeader("Content-Type", "text/calendar");
    res.send(mergedICS);
  } catch (error) {
    console.error("Error generating merged ICS file:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// Middleware
app.use(express.json());

// Endpoints
app.get("/", renderLoginPage);
app.post("/getUser", getUser);
app.get("/st/:student_id", logStudent);
app.get("/so/:society_id", logSociety);
app.post("/events", getEvents);
app.post("/addEvent", addEvent);
app.post("/updateEvent", updateEvent);
app.post("/downloadEvents", downloadEvents);

// Static Assets
app.use(express.static(path.join(__dirname, "src")));
app.use("/style", express.static(path.join(__dirname, "src", "style")));

// Start Server
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Server running locally at: http://localhost:${PORT}`);
  try {
    const url = await ngrok.connect(PORT);
    console.log(`Public HTTPS URL: ${url}`);
  } catch (err) {
    console.error("Error starting Ngrok:", err);
  }
});
