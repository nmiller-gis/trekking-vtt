import { useEffect, useState } from 'react';
import { api, RoomSummary } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useGameStore } from '../../store/gameStore';
import { getSocket } from '../../hooks/useSocket';

export default function DashboardView() {
  const { username, clearAuth } = useAuthStore();
  const { setView, setRoomCode, connectionStatus } = useUIStore();
  const { setMyPlayerId } = useGameStore();

  const [gmRooms, setGmRooms] = useState<RoomSummary[]>([]);
  const [memberRooms, setMemberRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create room form
  const [showCreate, setShowCreate] = useState(false);
  const [gmPassword, setGmPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join room form
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinGmPassword, setJoinGmPassword] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Confirm delete/leave state
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.myRooms(), api.memberRooms()])
      .then(([gm, member]) => {
        setGmRooms(gm);
        const memberOnly = member.filter((m) => !gm.find((g) => g.id === m.id));
        setMemberRooms(memberOnly);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const joinRoom = (roomCode: string, gmPassword?: string) => {
    const socket = getSocket();
    socket.emit('join-room', {
      roomCode,
      playerName: username ?? 'Unknown',
      gmPassword: gmPassword || undefined,
    }, (result) => {
      if ('error' in result) {
        setJoinError(result.error);
        setJoining(false);
        return;
      }
      setRoomCode(roomCode);
      setMyPlayerId(socket.id!, !!gmPassword);
      setView('station-select');
    });
  };

  const createRoom = () => {
    if (!gmPassword) { setCreateError('GM password required'); return; }
    setCreating(true);
    setCreateError(null);
    const socket = getSocket();
    socket.emit('create-room', {
      playerName: username ?? 'GM',
      gmPassword,
    }, (result) => {
      setCreating(false);
      if ('error' in result) { setCreateError(result.error); return; }
      setRoomCode(result.roomCode);
      setMyPlayerId(socket.id!, true);
      setView('station-select');
    });
  };

  const handleJoin = () => {
    if (!joinCode.trim()) { setJoinError('Room code required'); return; }
    setJoining(true);
    setJoinError(null);
    joinRoom(joinCode.trim().toUpperCase(), joinGmPassword || undefined);
  };

  const startRename = (room: RoomSummary) => {
    setRenamingId(room.id);
    setRenameValue(room.name);
  };

  const submitRename = async (roomCode: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    try {
      await api.renameRoom(roomCode, renameValue.trim());
      setGmRooms((prev) => prev.map((r) => r.roomCode === roomCode ? { ...r, name: renameValue.trim() } : r));
    } catch { /* ignore */ }
    setRenamingId(null);
  };

  const deleteRoom = async (roomCode: string) => {
    try {
      await api.deleteRoom(roomCode);
      setGmRooms((prev) => prev.filter((r) => r.roomCode !== roomCode));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
    setConfirmingId(null);
  };

  const leaveRoom = async (roomCode: string) => {
    try {
      await api.leaveRoom(roomCode);
      setMemberRooms((prev) => prev.filter((r) => r.roomCode !== roomCode));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to leave');
    }
    setConfirmingId(null);
  };

  const formatDate = (unix: number) => {
    const d = new Date(unix * 1000);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-lcars-border bg-lcars-panel shrink-0">
        <div className="flex items-center gap-1 mr-2">
          <div className="w-3 h-8 bg-lcars-amber rounded-full" />
          <div className="w-1 h-6 bg-lcars-blue" />
        </div>
        <div className="text-lcars-amber font-bold uppercase tracking-widest">LCARS VTT</div>
        <div className="flex-1" />
        <span className="text-gray-400 text-sm">{username}</span>
        <button className="lcars-btn-ghost text-xs px-3 py-1" onClick={clearAuth}>Sign Out</button>
      </div>

      {/* Connection status warning */}
      {connectionStatus !== 'connected' && (
        <div className="px-6 py-2 bg-lcars-red/10 border-b border-lcars-red text-lcars-red text-xs uppercase">
          ◉ Connecting to server…
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl w-full mx-auto space-y-6">

        {/* Quick actions */}
        <div className="flex gap-3">
          <button
            className="lcars-btn-amber px-4 py-2 text-sm"
            onClick={() => { setShowCreate(!showCreate); setShowJoin(false); }}
          >
            + New Campaign
          </button>
          <button
            className="lcars-btn-ghost px-4 py-2 text-sm"
            onClick={() => { setShowJoin(!showJoin); setShowCreate(false); }}
          >
            Join by Code
          </button>
        </div>

        {/* Create room panel */}
        {showCreate && (
          <div className="lcars-panel p-4 border-lcars-amber border space-y-3">
            <div className="lcars-header">New Campaign</div>
            <div>
              <label className="lcars-label block mb-1">GM Password</label>
              <input
                className="lcars-input"
                type="password"
                placeholder="Players will NOT need this — only for re-joining as GM"
                value={gmPassword}
                onChange={(e) => setGmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createRoom()}
                autoFocus
              />
              <div className="text-xs text-gray-500 mt-1">
                Set a password so you can reclaim GM access if you reconnect.
              </div>
            </div>
            {createError && <div className="text-lcars-red text-sm">{createError}</div>}
            <div className="flex gap-2">
              <button
                className="lcars-btn-amber text-sm"
                onClick={createRoom}
                disabled={creating || connectionStatus !== 'connected'}
              >
                {creating ? 'Creating…' : 'Create Campaign'}
              </button>
              <button className="lcars-btn-ghost text-sm" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Join room panel */}
        {showJoin && (
          <div className="lcars-panel p-4 border-lcars-blue border space-y-3">
            <div className="lcars-header">Join by Room Code</div>
            <div>
              <label className="lcars-label block mb-1">Room Code</label>
              <input
                className="lcars-input uppercase"
                placeholder="ABC123"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                autoFocus
              />
            </div>
            <div>
              <label className="lcars-label block mb-1">GM Password (optional)</label>
              <input
                className="lcars-input"
                type="password"
                placeholder="Leave blank to join as crew"
                value={joinGmPassword}
                onChange={(e) => setJoinGmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>
            {joinError && <div className="text-lcars-red text-sm">{joinError}</div>}
            <div className="flex gap-2">
              <button
                className="lcars-btn text-sm bg-lcars-blue text-black"
                onClick={handleJoin}
                disabled={joining || connectionStatus !== 'connected'}
              >
                {joining ? 'Joining…' : 'Join'}
              </button>
              <button className="lcars-btn-ghost text-sm" onClick={() => setShowJoin(false)}>Cancel</button>
            </div>
          </div>
        )}

        {loading && <div className="text-gray-500 text-sm uppercase">Loading rooms…</div>}
        {error && <div className="text-lcars-red text-sm">{error}</div>}

        {/* GM's campaigns */}
        {!loading && gmRooms.length > 0 && (
          <div>
            <div className="lcars-header mb-3">Your Campaigns</div>
            <div className="space-y-2">
              {gmRooms.map((room) => (
                <div key={room.id} className="lcars-panel p-4 border-l-4 border-lcars-amber">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {renamingId === room.id ? (
                        <input
                          className="lcars-input text-sm py-0.5 w-full"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => submitRename(room.roomCode)}
                          onKeyDown={(e) => e.key === 'Enter' && submitRename(room.roomCode)}
                          autoFocus
                        />
                      ) : (
                        <div
                          className="text-white font-bold cursor-pointer hover:text-lcars-amber"
                          onClick={() => startRename(room)}
                          title="Click to rename"
                        >
                          {room.name}
                        </div>
                      )}
                      <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="text-lcars-gold font-bold">{room.roomCode}</span>
                        <span>Last active: {formatDate(room.lastActivity)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {confirmingId === room.id ? (
                        <>
                          <span className="text-lcars-red text-xs self-center">Delete permanently?</span>
                          <button
                            className="lcars-btn-red text-sm px-3"
                            onClick={() => deleteRoom(room.roomCode)}
                          >
                            Confirm
                          </button>
                          <button
                            className="lcars-btn-ghost text-sm px-3"
                            onClick={() => setConfirmingId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="lcars-btn-amber text-sm px-4"
                            disabled={connectionStatus !== 'connected'}
                            onClick={() => joinRoom(room.roomCode, prompt(`GM password for "${room.name}":`) ?? undefined)}
                          >
                            Resume
                          </button>
                          <button
                            className="lcars-btn text-sm px-3 bg-lcars-panel border border-lcars-red text-lcars-red hover:bg-lcars-red hover:text-white"
                            onClick={() => setConfirmingId(room.id)}
                            title="Delete campaign"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaigns as member */}
        {!loading && memberRooms.length > 0 && (
          <div>
            <div className="lcars-header mb-3">Campaigns as Crew</div>
            <div className="space-y-2">
              {memberRooms.map((room) => (
                <div key={room.id} className="lcars-panel p-4 border-l-4 border-lcars-blue">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-white font-bold">{room.name}</div>
                      <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="text-lcars-blue font-bold">{room.roomCode}</span>
                        {room.lastStation && <span className="capitalize">Last station: {room.lastStation}</span>}
                        <span>Last active: {formatDate(room.lastActivity)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {confirmingId === room.id ? (
                        <>
                          <span className="text-lcars-red text-xs self-center">Remove yourself?</span>
                          <button
                            className="lcars-btn-red text-sm px-3"
                            onClick={() => leaveRoom(room.roomCode)}
                          >
                            Confirm
                          </button>
                          <button
                            className="lcars-btn-ghost text-sm px-3"
                            onClick={() => setConfirmingId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="lcars-btn text-sm px-4 bg-lcars-blue text-black"
                            disabled={connectionStatus !== 'connected'}
                            onClick={() => joinRoom(room.roomCode)}
                          >
                            Rejoin
                          </button>
                          <button
                            className="lcars-btn text-sm px-3 bg-lcars-panel border border-gray-600 text-gray-400 hover:border-lcars-red hover:text-lcars-red"
                            onClick={() => setConfirmingId(room.id)}
                            title="Remove from list"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && gmRooms.length === 0 && memberRooms.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-600 text-sm uppercase mb-2">No campaigns yet</div>
            <div className="text-gray-700 text-xs">Create a new campaign to get started</div>
          </div>
        )}
      </div>
    </div>
  );
}
