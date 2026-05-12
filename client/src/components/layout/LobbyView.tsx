import { useState } from 'react';
import { getSocket } from '../../hooks/useSocket';
import { useUIStore } from '../../store/uiStore';
import { useGameStore } from '../../store/gameStore';

export default function LobbyView() {
  const { setView, setRoomCode, errorMessage, setErrorMessage, connectionStatus } = useUIStore();
  const { setMyPlayerId } = useGameStore();

  const [mode, setMode] = useState<'create' | 'join'>('join');
  const [playerName, setPlayerName] = useState('');
  const [gmPassword, setGmPassword] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = () => {
    if (!playerName.trim() || !gmPassword.trim()) {
      setErrorMessage('Name and GM password are required');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    const socket = getSocket();
    socket.emit('create-room', { playerName: playerName.trim(), gmPassword: gmPassword.trim() }, (result) => {
      setLoading(false);
      if ('error' in result) {
        setErrorMessage(result.error);
        return;
      }
      setRoomCode(result.roomCode);
      setMyPlayerId(socket.id!, true);
      setView('station-select');
    });
  };

  const handleJoin = () => {
    if (!playerName.trim() || !roomCodeInput.trim()) {
      setErrorMessage('Name and room code are required');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    const socket = getSocket();
    socket.emit('join-room', {
      roomCode: roomCodeInput.trim().toUpperCase(),
      playerName: playerName.trim(),
      gmPassword: gmPassword.trim() || undefined,
    }, (result) => {
      setLoading(false);
      if ('error' in result) {
        setErrorMessage(result.error);
        return;
      }
      setRoomCode(roomCodeInput.trim().toUpperCase());
      setMyPlayerId(socket.id!, !!gmPassword.trim());
      setView('station-select');
    });
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* LCARS header bar */}
        <div className="flex items-center mb-8">
          <div className="w-4 h-20 bg-lcars-amber rounded-l-full mr-1" />
          <div className="w-2 h-12 bg-lcars-blue mr-4" />
          <div>
            <div className="text-lcars-amber text-2xl uppercase tracking-widest">LCARS VTT</div>
            <div className="text-lcars-blue text-xs uppercase tracking-widest">Star Trek Adventures 2e</div>
          </div>
        </div>

        {connectionStatus === 'disconnected' || connectionStatus === 'error' ? (
          <div className="lcars-panel p-4 border-lcars-red border mb-4">
            <span className="text-lcars-red lcars-blink">◉ </span>
            <span className="text-sm uppercase">
              {connectionStatus === 'error' ? 'Connection error — server unreachable' : 'Connecting to server…'}
            </span>
          </div>
        ) : null}

        {/* Mode toggle */}
        <div className="flex mb-6 gap-1">
          <button
            className={`flex-1 lcars-btn ${mode === 'join' ? 'bg-lcars-amber text-black' : 'lcars-btn-ghost'}`}
            onClick={() => setMode('join')}
          >
            Join Room
          </button>
          <button
            className={`flex-1 lcars-btn ${mode === 'create' ? 'bg-lcars-amber text-black' : 'lcars-btn-ghost'}`}
            onClick={() => setMode('create')}
          >
            Create Room (GM)
          </button>
        </div>

        <div className="lcars-panel p-6 space-y-4">
          <div>
            <label className="lcars-label block mb-1">Your Name</label>
            <input
              className="lcars-input"
              placeholder="Commander Riker"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (mode === 'create' ? handleCreate() : handleJoin())}
            />
          </div>

          {mode === 'join' && (
            <div>
              <label className="lcars-label block mb-1">Room Code</label>
              <input
                className="lcars-input uppercase"
                placeholder="ABC123"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>
          )}

          <div>
            <label className="lcars-label block mb-1">
              {mode === 'create' ? 'GM Password' : 'GM Password (optional — enter to join as GM)'}
            </label>
            <input
              className="lcars-input"
              type="password"
              placeholder="••••••••"
              value={gmPassword}
              onChange={(e) => setGmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (mode === 'create' ? handleCreate() : handleJoin())}
            />
          </div>

          {errorMessage && (
            <div className="text-lcars-red text-sm uppercase">{errorMessage}</div>
          )}

          <button
            className="lcars-btn-amber w-full mt-2"
            disabled={loading || connectionStatus !== 'connected'}
            onClick={mode === 'create' ? handleCreate : handleJoin}
          >
            {loading ? 'Connecting…' : mode === 'create' ? 'Create Room' : 'Join Room'}
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-600 text-center uppercase tracking-widest">
          Starfleet Communications Network v2.e
        </div>
      </div>
    </div>
  );
}
