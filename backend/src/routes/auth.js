import { Router } from 'express';
import * as users from '../auth.js';
import { requireAuth, requireAdmin, publicUser, signToken, verifyPassword } from '../auth.js';

const router = Router();

// Express 4 does not forward rejected promises, so async handlers are wrapped.
const route = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

// First registration bootstraps the workspace administrator.
router.post('/register', route(async (req, res) => {
  const { email, password, full_name } = req.body || {};

  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Use at least 8 characters for the password' });
  if (await users.findUserByEmail(email)) return res.status(409).json({ error: 'An account with that email already exists' });

  const isFirstUser = (await users.countUsers()) === 0;
  const user = await users.createUser({
    email,
    password,
    full_name,
    role: isFirstUser ? 'admin' : 'user',
  });

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

router.post('/login', route(async (req, res) => {
  const { email, password } = req.body || {};
  const user = await users.findUserByEmail(email);
  if (!user || !verifyPassword(String(password || ''), user.password_hash)) {
    return res.status(401).json({ error: 'Email or password is incorrect' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
}));

router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

router.put('/me', requireAuth, route(async (req, res) => {
  const updated = await users.updateUser(req.user.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'User not found' });
  res.json(publicUser(updated));
}));

// --- User administration (admin only) ---

router.get('/users', requireAuth, requireAdmin, route(async (req, res) => {
  res.json(await users.listUsers());
}));

router.post('/users', requireAuth, requireAdmin, route(async (req, res) => {
  const { email, password, full_name, role } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (await users.findUserByEmail(email)) return res.status(409).json({ error: 'An account with that email already exists' });
  res.status(201).json(publicUser(await users.createUser({ email, password, full_name, role })));
}));

router.put('/users/:id/password', requireAuth, requireAdmin, route(async (req, res) => {
  const password = req.body?.password;
  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: 'Use at least 8 characters for the password' });
  }
  if (!(await users.setPassword(req.params.id, password))) return res.status(404).json({ error: 'User not found' });
  res.json({ updated: true });
}));

router.delete('/users/:id', requireAuth, requireAdmin, route(async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot remove your own account' });
  if (!(await users.deleteUser(req.params.id))) return res.status(404).json({ error: 'User not found' });
  res.json({ deleted: true });
}));

export default router;