import { Router } from 'express';
import { requireAuth, AuthedRequest } from '../auth';
import { roomQueries, memberQueries, roomDeleteQuery } from '../db';

const router = Router();

router.use(requireAuth);

router.get('/', (req: AuthedRequest, res) => {
  const rooms = roomQueries.findByGM.all(req.user!.userId);
  res.json(rooms.map((r) => ({
    id: r.id,
    roomCode: r.room_code,
    name: r.name,
    lastActivity: r.last_activity,
    createdAt: r.created_at,
  })));
});

router.get('/member', (req: AuthedRequest, res) => {
  const memberships = memberQueries.findRoomMembers
    .all(req.user!.userId)
    .map((m) => {
      const room = roomQueries.findById.get(m.room_id);
      if (!room) return null;
      return {
        id: room.id,
        roomCode: room.room_code,
        name: room.name,
        lastActivity: room.last_activity,
        lastStation: m.last_station,
      };
    })
    .filter(Boolean);
  res.json(memberships);
});

router.patch('/:roomCode/name', (req: AuthedRequest, res) => {
  const room = roomQueries.findByCode.get(req.params.roomCode);
  if (!room) { res.status(404).json({ error: 'Room not found' }); return; }
  if (room.gm_user_id !== req.user!.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
  const { name } = req.body as { name?: string };
  if (!name?.trim()) { res.status(400).json({ error: 'Name required' }); return; }
  roomQueries.updateName.run(name.trim(), room.id);
  res.json({ ok: true });
});

router.delete('/:roomCode', (req: AuthedRequest, res) => {
  const room = roomQueries.findByCode.get(req.params.roomCode);
  if (!room) { res.status(404).json({ error: 'Room not found' }); return; }
  if (room.gm_user_id !== req.user!.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
  roomDeleteQuery.run(room.id);
  res.json({ ok: true });
});

router.delete('/:roomCode/membership', (req: AuthedRequest, res) => {
  const room = roomQueries.findByCode.get(req.params.roomCode);
  if (!room) { res.status(404).json({ error: 'Room not found' }); return; }
  memberQueries.deleteMember.run(room.id, req.user!.userId);
  res.json({ ok: true });
});

export default router;
