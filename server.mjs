import express from "express";
import * as db from "./database.js";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "src")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "index.html"));
});

app.post("/addEvent", async (req, res) => {
    try {
        const {
            title,
            event_description,
            event_date,
            event_start,
            event_end,
            is_online,
            address_1,
            address_2,
            town,
            postcode,
        } = req.body;

        const isOnlineValue = is_online === "on" ? 1 : 0;

        const newEvent = {
            title,
            event_description,
            event_date,
            event_start,
            event_end,
            is_online: isOnlineValue,
            address_1,
            address_2,
            town,
            postcode,
        };

        const newEventWithID = await db.addEvent(newEvent);

        res.status(200).json(newEventWithID);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/updateEvent", async (req, res) => {
    try {
        const {
            event_id,
            title,
            event_description,
            event_date,
            event_start,
            event_end,
            is_online,
            address_1,
            address_2,
            town,
            postcode,
            event_status
        } = req.body;

        const isOnlineValue = is_online === "true" ? 1 : 0;

        const updatedEvent = {
            event_id,
            title,
            event_description,
            event_date,
            event_start,
            event_end,
            is_online: isOnlineValue,
            address_1,
            address_2,
            town,
            postcode,
            event_status
        };

        await db.updateEvent(updatedEvent);
        res.status(200).json(updatedEvent);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/events", async (req, res) => {
    res.status(200).json(await db.getAllEvents());
});

app.listen(PORT, (error) => {
    if (!error) {
        console.log(`Server is running at: http://localhost:${PORT}`);
    } else {
        console.log("Error occurred, server can't start", error);
    }
});
