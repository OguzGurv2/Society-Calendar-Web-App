import fs from 'fs';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import util from 'util';
import { v4 as uuidv4 } from 'uuid';

fs.renameAsync = fs.renameAsync || util.promisify(fs.rename);

async function init() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database,
    verbose: true,
  });
  await db.migrate({ migrationsPath: './src/migrations' });
  return db;
}

const dbConn = init().then(db => db).catch(err => {
  console.error("Database initialization failed:", err);
  process.exit(1);
});

export async function addEvent(title, description, location, start, end) {
  const db = await dbConn;

  try {
    const id = uuidv4();
    await db.run('INSERT INTO events (event_id, title, description, location, start, end, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, title, description, location, start, end, 'CONFIRMED']);
  } catch (error) {
    console.error("Error adding user to DB:", error);
    throw error;
  }
}

export async function getAllEvents() {
  const db = await dbConn;
  const events = await db.all('SELECT title, description, location, start, end FROM events WHERE status = ?', ['CONFIRMED']);
  return events;
}