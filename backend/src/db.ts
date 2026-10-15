import { DatabaseSync } from 'node:sqlite';

// Opens the database file backend/clinic.db (creates it if it doesn't exist)
const db = new DatabaseSync('clinic.db');

// Create the appointments table (only if it doesn't exist yet)
db.exec(`
  CREATE TABLE IF NOT EXISTS appointments (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    patient   TEXT NOT NULL,
    time      TEXT NOT NULL,
    treatment TEXT NOT NULL
  )
`);

// Add some starter rows, but only the very first time (when the table is empty)
const { count } = db.prepare('SELECT COUNT(*) AS count FROM appointments').get() as { count: number };
if (count === 0) {
  const insert = db.prepare('INSERT INTO appointments (patient, time, treatment) VALUES (?, ?, ?)');
  insert.run('Rahul Sharma', '10:00 AM', 'Check-up');
  insert.run('Priya Singh', '11:30 AM', 'Filling');
  insert.run('Amit Kumar', '02:00 PM', 'Cleaning');
}

// The shape of one row in the appointments table
export type Appointment = {
  id: number;
  patient: string;
  time: string;
  treatment: string;
};

// Read every appointment from the table
export function getAppointments(): Appointment[] {
  return db.prepare('SELECT * FROM appointments ORDER BY id').all() as Appointment[];
}

// Save a new appointment and return it (with the id the database gave it)
export function addAppointment(patient: string, time: string, treatment: string): Appointment {
  const result = db
    .prepare('INSERT INTO appointments (patient, time, treatment) VALUES (?, ?, ?)')
    .run(patient, time, treatment);
  return { id: Number(result.lastInsertRowid), patient, time, treatment };
}

// Find an appointment at a given time (undefined if the slot is free)
export function findByTime(time: string): Appointment | undefined {
  return db.prepare('SELECT * FROM appointments WHERE time = ?').get(time) as Appointment | undefined;
}
