// Account rows, in whichever store is configured. Password hashing and tokens live in auth.js.
import crypto from 'node:crypto';
import { all, get, run } from './sql.js';

export async function countUsers() {
  const row = await get('SELECT COUNT(*) AS total FROM users');
  return row ? Number(row.total) : 0;
}

export async function findUserByEmail(email) {
  return get('SELECT * FROM users WHERE lower(email) = lower(?)', [String(email || '').trim()]);
}

export async function findUserById(id) {
  return get('SELECT * FROM users WHERE id = ?', [id]);
}

export async function createUserRecord({ email, password_hash, full_name, role }) {
  const id = crypto.randomUUID();
  await run(
    `INSERT INTO users (id, email, password_hash, full_name, role, created_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, String(email).trim(), password_hash, full_name || null, role, new Date().toISOString()]
  );
  return findUserById(id);
}

export async function updateUserRecord(id, patch) {
  const current = await findUserById(id);
  if (!current) return null;
  const fullName = patch?.full_name ?? current.full_name;
  await run('UPDATE users SET full_name = ? WHERE id = ?', [fullName, id]);
  return findUserById(id);
}

export async function listUserRecords() {
  return all('SELECT * FROM users ORDER BY created_date ASC');
}

export async function setPasswordHash(id, hash) {
  return (await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id])).changes > 0;
}

export async function deleteUserRecord(id) {
  return (await run('DELETE FROM users WHERE id = ?', [id])).changes > 0;
}