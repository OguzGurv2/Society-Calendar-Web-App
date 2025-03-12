import express from "express";
import * as db from "./database.js";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";
import bcrypt from 'bcrypt';
import { createEvent} from 'ics'; 

// Load environment variables(port number) from .env file
dotenv.config();

// Define __dirname for ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Open Login Portal
async function renderLoginPage(req, res) {
  res.sendFile(path.join(__dirname, "src", "login.html"));
}

// Get User Details
async function getUser(req, res) {
  try {
    const { email, password } = req.body;
    let userData;
    
    if (email.endsWith('@upsu.net')) {
      userData = await db.getSocietyUser(email);
    } else {
      userData = await db.getStudentUser(email);
    }

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const isPasswordValid = await bcrypt.compare(password, userData.society_password || userData.student_password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }
    
    res.status(200).json({ message: "Login successful", user: userData });
    
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }  
}

// Logs Student User to the application
async function logStudent(req, res) {
  res.sendFile(path.join(__dirname, "src", "index.html"));
}

// Logs Society User to the application
async function logSociety(req, res) {
  res.sendFile(path.join(__dirname, "src", "index.html"));
}

// Fetch All Events
async function getEvents(req, res) {
  try {
    const { userType, userId: id } = req.body;

    let events;
    if (userType == 'society') {
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
    const isOnline = is_online === "on" ? 1 : 0;

    const updatedEvent = { ...eventDetails, is_online: isOnline };
    await db.updateEvent(updatedEvent);

    res.status(200).json(updatedEvent);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// Download Events as ICS
async function downloadEvents(req, res) {
  try {
    const { events } = req.body;
    const filename = 'ExampleEvent.ics';
    const icsEvents = [];

    await Promise.all(events.map(async (event) => {
      return new Promise((resolve, reject) => {
        createEvent(event, (error, value) => {
          if (error) {
            reject(error);
          }
          icsEvents.push(value);
          resolve(); 
        });
      });
    }));

    const icsContent = icsEvents.join('\n'); 

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    res.send(icsContent);

  } catch (error) {
    console.error("Error generating ICS file:", error);
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

// AFTER routes, so it doesn't override "/"
app.use(express.static(path.join(__dirname, "src")));
app.use('/style', express.static(path.join(__dirname, 'src', 'style')));

// Start Server
app.listen(PORT, () =>
  console.log(`Server running at: http://localhost:${PORT}`)
);
