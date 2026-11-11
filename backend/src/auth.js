import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as accounts from './usersStore.js';

const JWT_SECRET = process.env.JWT_SECRET || 'successionpath-dev-secret-change-me';
const JWT_TTL = process.env.JWT_TTL || '7d';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}

if (!process.env.JWT_SECRET) {
  console.warn('[auth] JWT_SECRET is not set — using an insecure development secret.');
}

export const ROLES = ['admin', 'user'];

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_TTL });
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    created_date: row.created_date,
  };
}

export const countUsers = accounts.countUsers;
export const findUserByEmail = accounts.findUserByEmail;
export const findUserById = accounts.findUserById;

export async function createUser({ email, password, full_name, role = 'user' }) {
  return accounts.createUserRecord({
    email,
    password_hash: hashPassword(password),
    full_name,
    role: ROLES.includes(role) ? role : 'user',
  });
}

export async function updateUser(id, patch) {
  return accounts.updateUserRecord(id, patch);
}

export async function listUsers() {
  const rows = await accounts.listUserRecords();
  return rows.map(publicUser);
}

export async function setPassword(id, password) {
  return accounts.setPasswordHash(id, hashPassword(password));
}

export const deleteUser = accounts.deleteUserRecord;

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    req.user = publicUser(user);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired — sign in again' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Administrator access required' });
  next();
}
