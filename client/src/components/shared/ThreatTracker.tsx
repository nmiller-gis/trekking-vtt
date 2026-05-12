import { useThreat, useIsGM } from '../../hooks/useGameState';
import { getSocket } from '../../hooks/useSocket';
import { useState } from 'react';

export default function ThreatTracker() {
  const threat = useThreat();
  const isGM = useIsGM();
  const [reason, setReason] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [pendingDelta, setPendingDelta] = useState(0);

  const change = (delta: number) => {
    if (delta < 0 && !isGM) return;
    if (delta < 0) {
      setPendingDelta(delta);
      setShowInput(true);
    } else {
      getSocket().emit('add-threat', { amount: delta, reason: reason || 'Threat added' });
    }
  };

  const confirmSpend = () => {
    getSocket().emit('gm-spend-threat', { amount: Math.abs(pendingDelta), reason: reason || 'Threat spent' }, (r) => {
      if ('error' in r) console.warn(r.error);
    });
    setShowInput(false);
    setReason('');
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="lcars-label">Threat</div>
      <div className="flex items-center gap-2">
        <span className="text-lcars-red text-2xl font-bold">{threat}</span>
        {isGM && (
          <div className="flex gap-1">
            <button className="lcars-btn text-xs px-2 py-1 bg-lcars-red text-white" onClick={() => change(-1)}>−</button>
            <button className="lcars-btn text-xs px-2 py-1 bg-lcars-red text-white" onClick={() => change(1)}>+</button>
          </div>
        )}
        {!isGM && (
          <button className="lcars-btn text-xs px-2 py-1 bg-lcars-panel border border-lcars-red text-lcars-red"
            onClick={() => change(1)} title="Add threat (player action)">+</button>
        )}
      </div>
      {showInput && isGM && (
        <div className="flex gap-1 mt-1">
          <input
            className="lcars-input text-xs py-1 flex-1"
            placeholder="Reason for spend…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmSpend()}
            autoFocus
          />
          <button className="lcars-btn-red text-xs px-2" onClick={confirmSpend}>Confirm</button>
          <button className="lcars-btn-ghost text-xs px-2" onClick={() => setShowInput(false)}>✕</button>
        </div>
      )}
    </div>
  );
}
