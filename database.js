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
    return await db.get(`SELECT * FROM society WHERE society_email = ?`, [
      email,
    ]);
  } catch (error) {
    console.error("Error fetching Society User:", error);
    throw error;
  }
}

// Get Student User Details
export async function getStudentUser(email) {
  const db = await dbConn;
  try {
    return await db.get(`SELECT * FROM student WHERE student_email = ?`, [
      email,
    ]);
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
      `INSERT INTO event_location (
      event_id, 
      is_online, 
      event_address, 
      town, 
      postcode
      )
             VALUES (?, ?, ?, ?, ?)`,
      [id, event.is_online, event.event_address, event.town, event.postcode]
    );

    const linksJSON = JSON.stringify(event.links);

    await db.run(
      `INSERT INTO event (
      event_id, 
      event_name, 
      event_description, 
      event_date, 
      event_start, 
      event_end, 
      event_status, 
      event_links, 
      society_id
      )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        event.event_name,
        event.event_description,
        event.event_date,
        event.event_start,
        event.event_end,
        "Scheduled",
        linksJSON,
        event.society_id,
      ]
    );

    return { ...event, event_id: id, event_links: linksJSON };
  } catch (error) {
    console.error("Error adding event to DB:", error);
    throw error;
  }
}

export async function addRecurringEvents(event) {
  const db = await dbConn;
  const baseDate = new Date(event.event_date);
  const year = baseDate.getFullYear();
  const endDate = new Date(`${year}-06-27`);
  const recurrenceDates = [];

  // Get the weekday index (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const dayOfWeek = baseDate.getDay();

  // Start from the base date and iterate weekly until June 27
  for (
    let date = new Date(baseDate);
    date <= endDate;
    date.setDate(date.getDate() + 7)
  ) {
    if (date.getDay() === dayOfWeek) {
      recurrenceDates.push(new Date(date));
    }
  }

  const insertedEvents = [];

  try {
    for (const date of recurrenceDates) {
      const id = uuidv4();

      const formattedDate = date.toISOString().split("T")[0]; // 'YYYY-MM-DD'
      const linksJSON = JSON.stringify(event.links);

      await db.run(
        `INSERT INTO event_location (
        event_id, 
        is_online, 
        event_address, 
        town, 
        postcode
        )
               VALUES (?, ?, ?, ?, ?)`,
        [
          id, 
          event.is_online, 
          event.event_address, 
          event.town, 
          event.postcode
        ]
      );

      await db.run(
        `INSERT INTO event (
        event_id, 
        event_name, 
        event_description, 
        event_date, 
        event_start, 
        event_end, 
        event_status, 
        event_links, 
        society_id
        )
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          event.event_name,
          event.event_description,
          formattedDate,
          event.event_start,
          event.event_end,
          "Scheduled",
          linksJSON,
          event.society_id,
        ]
      );

      insertedEvents.push({
        ...event,
        event_date: formattedDate,
        event_id: id,
      });
    }

    return insertedEvents;
  } catch (error) {
    console.error("Error adding recurring events:", error);
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
        event.event_address,
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

// Only Gets the User's(Society) Events
export async function getSocietyEvents(society_id) {
  const db = await dbConn;

  try {
    return await db.all(
      `SELECT 
          s.society_name,
          s.society_email,
          e.*, 
          el.*
        FROM society s
        JOIN event e ON s.society_id = e.society_id
        JOIN event_location el ON el.event_id = e.event_id 
        WHERE s.society_id = ?`,
      [society_id]
    );
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
}

// Gets User's(Student) Enrolled Society Events
export async function getStudentEvents(student_id) {
  const db = await dbConn;

  try {
    return await db.all(
      `SELECT
          so.society_name,
          so.society_email, 
          e.*,
          el.*
        FROM student s
        JOIN student_society ss ON s.student_id = ss.student_id
        JOIN society so ON ss.society_id = so.society_id
        JOIN event e ON so.society_id = e.society_id  
        JOIN event_location el ON e.event_id = el.event_id 
        WHERE event_status = ?
        AND ss.is_enrolled = ?
        AND s.student_id = ?`,
      ["Scheduled", 1, student_id]
    );
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
}
