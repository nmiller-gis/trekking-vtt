import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { userQueries } from '../db';
import { signToken, requireAuth, AuthedRequest } from '../auth';

const router = Router();

router.post('/register', (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username?.trim() || !password || password.length < 6) {
    res.status(400).json({ error: 'Username required; password must be at least 6 characters' });
    return;
  }

  const existing = userQueries.findByUsername.get(username.trim());
  if (existing) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }

  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 10);
  userQueries.insert.run(id, username.trim(), password_hash);

  const token = signToken({ userId: id, username: username.trim() });
  res.json({ token, userId: id, username: username.trim() });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username?.trim() || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const user = userQueries.findByUsername.get(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const token = signToken({ userId: user.id, username: user.username });
  res.json({ token, userId: user.id, username: user.username });
});

router.get('/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ userId: req.user!.userId, username: req.user!.username });
});

export default router;
