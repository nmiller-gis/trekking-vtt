import { useState } from 'react';
import { useMomentum, useIsGM } from '../../hooks/useGameState';
import { getSocket } from '../../hooks/useSocket';
import MomentumSpendMenu from './MomentumSpendMenu';

const MOMENTUM_MAX = 6;

export default function MomentumTracker() {
  const momentum = useMomentum();
  const isGM = useIsGM();
  const [spending, setSpending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [reason, setReason] = useState('');

  const spend = (amount: number) => {
    if (momentum < amount) return;
    getSocket().emit('spend-momentum', { amount, reason: reason || 'Momentum spent' }, (result) => {
      if ('error' in result) console.warn(result.error);
    });
    setSpending(false);
    setReason('');
  };

  const add = (amount: number) => {
    getSocket().emit('add-momentum', { amount, source: 'GM added' });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="lcars-label">Momentum</div>
      <div className="flex gap-1 items-center">
        {Array.from({ length: MOMENTUM_MAX }, (_, i) => (
          <button
            key={i}
            className={`w-6 h-6 rounded-full border-2 transition-all
              ${i < momentum
                ? 'bg-lcars-gold border-lcars-gold'
                : 'bg-transparent border-gray-600'}
              ${!spending && i < momentum ? 'hover:bg-lcars-amber cursor-pointer' : 'cursor-default'}
            `}
            onClick={() => {
              if (!spending && i < momentum) setSpending(true);
            }}
            title={i < momentum ? 'Click to spend momentum' : ''}
          />
        ))}
        <span className="text-lcars-gold ml-1 text-sm">{momentum}/{MOMENTUM_MAX}</span>
      </div>

      {spending && (
        <div className="flex gap-1 mt-1">
          <input
            className="lcars-input text-xs py-1 flex-1"
            placeholder="Reason…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && spend(1)}
            autoFocus
          />
          <button className="lcars-btn-amber text-xs px-2" onClick={() => spend(1)}>−1</button>
          {momentum >= 2 && <button className="lcars-btn-amber text-xs px-2" onClick={() => spend(2)}>−2</button>}
          <button className="lcars-btn-ghost text-xs px-2" onClick={() => setSpending(false)}>✕</button>
        </div>
      )}

      {isGM && !spending && (
        <div className="flex gap-1 mt-1">
          <button className="lcars-btn-ghost text-xs px-2" onClick={() => add(1)}>+1</button>
          <button className="lcars-btn-ghost text-xs px-2" onClick={() => spend(1)}>−1</button>
        </div>
      )}

      {!spending && (
        <button
          className="text-xs text-gray-500 hover:text-lcars-gold mt-1 text-left"
          onClick={() => setShowMenu(!showMenu)}
        >
          {showMenu ? '▲ Hide spends' : '▼ Named spends'}
        </button>
      )}
      {showMenu && <MomentumSpendMenu />}
    </div>
  );
}
