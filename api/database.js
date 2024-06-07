import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export const dbPromise = open({
  filename: './data.db',
  driver: sqlite3.Database
});

export async function initializeDatabase() {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS websites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      status TEXT NOT NULL,
      notification_sent INTEGER DEFAULT 0
    )
  `);
}

export async function getWebsites() {
  const db = await dbPromise;
  return db.all('SELECT * FROM websites');
}

export async function addWebsite(url, status) {
  const db = await dbPromise;
  await db.run('INSERT INTO websites (url, status, notification_sent) VALUES (?, ?, 0)', url, status);
}

export async function updateWebsiteStatus(url, status) {
  const db = await dbPromise;
  await db.run('UPDATE websites SET status = ?, notification_sent = 0 WHERE url = ? AND status != ?', status, url, status);
}

export async function deleteWebsite(url) {
  const db = await dbPromise;
  await db.run('DELETE FROM websites WHERE url = ?', url);
}

export async function setNotificationSent(url) {
  const db = await dbPromise;
  await db.run('UPDATE websites SET notification_sent = 1 WHERE url = ?', url);
}
