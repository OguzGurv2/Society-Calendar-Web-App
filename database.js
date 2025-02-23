import fs from "fs";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import util from "util";
import { v4 as uuidv4 } from "uuid";

fs.renameAsync = fs.renameAsync || util.promisify(fs.rename);

async function init() {
  const db = await open({
    filename: "./database.sqlite",
    driver: sqlite3.Database,
    verbose: true,
  });
  await db.migrate({ migrationsPath: "./src/migrations" });
  return db;
}

const dbConn = init()
  .then((db) => db)
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });

export async function addEvent(event) {
  const db = await dbConn;

  try {
    const id = uuidv4();
    await db.run(
      "INSERT INTO event_location (event_id, is_online, address_1, address_2, town, postcode) VALUES (?, ?, ?, ?, ?, ?)",
      [
        id,
        event.is_online,
        event.address_1,
        event.address_2,
        event.postcode,
        event.town,
      ]
    );
    await db.run(
      "INSERT INTO event (event_id, title, event_description, event_date, event_start, event_end, event_status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        event.title,
        event.event_description,
        event.event_date,
        event.event_start,
        event.event_end,
        "Scheduled",
      ]
    );

    event.event_id = id;
    return event;

  } catch (error) {
    console.error("Error adding user to DB:", error);
    throw error;
  }
}

export async function updateEvent(event) {
  const db = await dbConn;

  try {
    await db.run(
      "UPDATE event_location SET is_online = ?, address_1 = ?, address_2 = ?, town = ?, postcode = ? WHERE event_id = ?",
      [
        event.is_online,
        event.address_1,
        event.address_2,
        event.town,
        event.postcode,
        event.event_id,
      ]
    );
    await db.run(
      "UPDATE event SET title = ?, event_description = ?, event_date = ?, event_start = ?, event_end = ?, event_status = ? WHERE event_id = ?",
      [
        event.title,
        event.event_description,
        event.event_date,
        event.event_start,
        event.event_end,
        event.event_status,
        event.event_id
      ]
    );
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
}

export async function getAllEvents() {
  const db = await dbConn;
  const events = await db.all(
    "SELECT e.event_id, e.title, e.event_description, e.event_date, e.event_start, e.event_end, el.is_online, el.address_1, el.address_2, el.town, el.postcode FROM event e JOIN event_location el ON el.event_id == e.event_id WHERE event_status = ?",
    ["Scheduled"]
  );
  return events;
}
