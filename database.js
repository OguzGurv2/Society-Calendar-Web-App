import fs from "fs";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import util from "util";
import { v4 as uuidv4 } from "uuid";

// Promisify fs.rename if not already available
fs.renameAsync = fs.renameAsync || util.promisify(fs.rename);

// Initialize Database Connection
async function init() {
  try {
    const db = await open({
      filename: "./database.sqlite",
      driver: sqlite3.Database,
      verbose: true,
    });

    await db.migrate({ migrationsPath: "./src/migrations" });
    return db;
  } catch (err) {
    console.error("Database initialization failed:", err);
    process.exit(1);
  }
}

// Establish Connection
const dbConn = init();

// Get Society User Details
export async function getSocietyUser(email) {
  const db = await dbConn;
  try {
    return await db.get(
      `SELECT * FROM society WHERE society_email = ?`,
      [email]
    );
  } catch (error) {
    console.error("Error fetching Society User:", error);
    throw error;
  }
}

// Get Student User Details
export async function getStudentUser(email) {
  const db = await dbConn;
  try {
    return await db.get(
      `SELECT * FROM student WHERE student_email = ?`,
      [email]
    );
  } catch (error) {
    console.error("Error fetching Student User:", error);
    throw error;
  }
}

// Add Event
export async function addEvent(event) {
  const db = await dbConn;
  const id = uuidv4();

  try {
    await db.run(
      `INSERT INTO event_location (event_id, is_online, event_address, town, postcode)
             VALUES (?, ?, ?, ?, ?)`,
      [id, event.is_online, event.address_1, event.town, event.postcode]
    );

    const linksJSON = JSON.stringify(event.links);

    await db.run(
      `INSERT INTO event (event_id, event_name, event_description, event_date, event_start, event_end, event_status, event_links)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        event.event_name,
        event.event_description,
        event.event_date,
        event.event_start,
        event.event_end,
        "Scheduled",
        linksJSON,
      ]
    );

    return { ...event, event_id: id };
  } catch (error) {
    console.error("Error adding event to DB:", error);
    throw error;
  }
}

// Update Event
export async function updateEvent(event) {
  const db = await dbConn;

  try {
    await db.run(
      `UPDATE event_location 
             SET is_online = ?, event_address = ?, town = ?, postcode = ? 
             WHERE event_id = ?`,
      [
        event.is_online,
        event.address_1,
        event.town,
        event.postcode,
        event.event_id,
      ]
    );

    const linksJSON = JSON.stringify(event.links);

    await db.run(
      `UPDATE event 
             SET event_name = ?, event_description = ?, event_date = ?, event_start = ?, event_end = ?, event_status = ?, event_links = ?
             WHERE event_id = ?`,
      [
        event.event_name,
        event.event_description,
        event.event_date,
        event.event_start,
        event.event_end,
        event.event_status,
        linksJSON,
        event.event_id,
      ]
    );
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
}

// Fetch All Events
export async function getAllEvents() {
  const db = await dbConn;

  try {
    return await db.get(
      `SELECT 
                e.event_id, e.event_name, e.event_description, e.event_date, e.event_start, e.event_end, e.event_links, 
                el.is_online, el.event_address, el.town, el.postcode 
             FROM event e 
             JOIN event_location el ON el.event_id = e.event_id 
             WHERE event_status = ?`,
      ["Scheduled"]
    );
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
}
