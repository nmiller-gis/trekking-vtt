import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

type Mode = 'login' | 'register';

export default function AuthView() {
  const { setAuth } = useAuthStore();
  const { setView } = useUIStore();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) { setError('All fields required'); return; }
    setLoading(true);
    setError(null);
    try {
      const result = mode === 'login'
        ? await api.login(username.trim(), password)
        : await api.register(username.trim(), password);
      setAuth(result.token, result.userId, result.username);
      setView('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* LCARS header */}
        <div className="flex items-center mb-8">
          <div className="w-4 h-20 bg-lcars-amber rounded-l-full mr-1" />
          <div className="w-2 h-12 bg-lcars-blue mr-4" />
          <div>
            <div className="text-lcars-amber text-2xl uppercase tracking-widest">LCARS VTT</div>
            <div className="text-lcars-blue text-xs uppercase tracking-widest">Star Trek Adventures 2e</div>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 mb-6">
          <button
            className={`flex-1 lcars-btn ${mode === 'login' ? 'bg-lcars-amber text-black' : 'lcars-btn-ghost'}`}
            onClick={() => { setMode('login'); setError(null); }}
          >
            Sign In
          </button>
          <button
            className={`flex-1 lcars-btn ${mode === 'register' ? 'bg-lcars-amber text-black' : 'lcars-btn-ghost'}`}
            onClick={() => { setMode('register'); setError(null); }}
          >
            Create Account
          </button>
        </div>

        <div className="lcars-panel p-6 space-y-4">
          <div>
            <label className="lcars-label block mb-1">Username</label>
            <input
              className="lcars-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="commander.riker"
              autoFocus
            />
          </div>
          <div>
            <label className="lcars-label block mb-1">
              Password {mode === 'register' && <span className="text-gray-500">(min. 6 characters)</span>}
            </label>
            <input
              className="lcars-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-lcars-red text-sm uppercase">{error}</div>}

          <button
            className="lcars-btn-amber w-full"
            onClick={submit}
            disabled={loading}
          >
            {loading ? 'Working…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-600 text-center uppercase tracking-widest">
          Starfleet Personnel Records System
        </div>
      </div>
    </div>
  );
}
