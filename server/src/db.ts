import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'lcars.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    room_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT 'New Campaign',
    gm_user_id TEXT NOT NULL REFERENCES users(id),
    gm_password_hash TEXT NOT NULL,
    game_state TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_activity INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS room_members (
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    character_json TEXT,
    last_station TEXT,
    joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (room_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_rooms_gm ON rooms(gm_user_id);
  CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(room_code);
  CREATE INDEX IF NOT EXISTS idx_members_user ON room_members(user_id);
`);

export interface DbUser {
  id: string;
  username: string;
  password_hash: string;
  created_at: number;
}

export interface DbRoom {
  id: string;
  room_code: string;
  name: string;
  gm_user_id: string;
  gm_password_hash: string;
  game_state: string;
  created_at: number;
  last_activity: number;
}

export interface DbRoomMember {
  room_id: string;
  user_id: string;
  character_json: string | null;
  last_station: string | null;
  joined_at: number;
}

export const userQueries = {
  insert: db.prepare<[string, string, string]>(
    'INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)'
  ),
  findById: db.prepare<[string], DbUser>(
    'SELECT * FROM users WHERE id = ?'
  ),
  findByUsername: db.prepare<[string], DbUser>(
    'SELECT * FROM users WHERE username = ?'
  ),
};

export const roomQueries = {
  insert: db.prepare<[string, string, string, string, string, string]>(
    'INSERT INTO rooms (id, room_code, name, gm_user_id, gm_password_hash, game_state) VALUES (?, ?, ?, ?, ?, ?)'
  ),
  findByCode: db.prepare<[string], DbRoom>(
    'SELECT * FROM rooms WHERE room_code = ?'
  ),
  findById: db.prepare<[string], DbRoom>(
    'SELECT * FROM rooms WHERE id = ?'
  ),
  findByGM: db.prepare<[string], DbRoom>(
    'SELECT * FROM rooms WHERE gm_user_id = ? ORDER BY last_activity DESC'
  ),
  updateState: db.prepare<[string, number, string]>(
    'UPDATE rooms SET game_state = ?, last_activity = ? WHERE id = ?'
  ),
  updateName: db.prepare<[string, string]>(
    'UPDATE rooms SET name = ? WHERE id = ?'
  ),
  updateActivity: db.prepare<[number, string]>(
    'UPDATE rooms SET last_activity = ? WHERE id = ?'
  ),
};

export const memberQueries = {
  upsert: db.prepare<[string, string, string | null, string | null]>(
    `INSERT INTO room_members (room_id, user_id, character_json, last_station)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(room_id, user_id) DO UPDATE SET
       character_json = COALESCE(excluded.character_json, character_json),
       last_station = COALESCE(excluded.last_station, last_station)`
  ),
  updateCharacter: db.prepare<[string, string, string]>(
    'UPDATE room_members SET character_json = ? WHERE room_id = ? AND user_id = ?'
  ),
  updateStation: db.prepare<[string | null, string, string]>(
    'UPDATE room_members SET last_station = ? WHERE room_id = ? AND user_id = ?'
  ),
  findMember: db.prepare<[string, string], DbRoomMember>(
    'SELECT * FROM room_members WHERE room_id = ? AND user_id = ?'
  ),
  findRoomMembers: db.prepare<[string], DbRoomMember>(
    'SELECT * FROM room_members WHERE room_id = ?'
  ),
  deleteMember: db.prepare<[string, string]>(
    'DELETE FROM room_members WHERE room_id = ? AND user_id = ?'
  ),
};

export const roomDeleteQuery = db.prepare<[string]>(
  'DELETE FROM rooms WHERE id = ?'
);

export default db;
