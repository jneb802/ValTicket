import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(import.meta.dirname, '..', 'valticket.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    source TEXT NOT NULL DEFAULT 'discord',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    closed_at TEXT
  )
`);

export interface Ticket {
  id: number;
  thread_id: string;
  user_id: string;
  username: string;
  category: string;
  title: string;
  status: string;
  source: string;
  created_at: string;
  closed_at: string | null;
}

const insertStmt = db.prepare(`
  INSERT INTO tickets (thread_id, user_id, username, category, title, source)
  VALUES (@thread_id, @user_id, @username, @category, @title, @source)
`);

const closeStmt = db.prepare(`
  UPDATE tickets SET status = 'resolved', closed_at = datetime('now')
  WHERE thread_id = @thread_id
`);

const countRecentStmt = db.prepare(`
  SELECT COUNT(*) as count FROM tickets
  WHERE username = @username AND created_at > datetime('now', '-1 hour')
`);

const getByThreadStmt = db.prepare(`
  SELECT * FROM tickets WHERE thread_id = @thread_id
`);

export function createTicketRecord(data: {
  thread_id: string;
  user_id: string;
  username: string;
  category: string;
  title: string;
  source: 'mod';
}): void {
  insertStmt.run(data);
}

export function closeTicketRecord(threadId: string): void {
  closeStmt.run({ thread_id: threadId });
}

export function getRecentTicketCount(username: string): number {
  const row = countRecentStmt.get({ username }) as { count: number };
  return row.count;
}

export function getTicketByThread(threadId: string): Ticket | undefined {
  return getByThreadStmt.get({ thread_id: threadId }) as Ticket | undefined;
}
