import { useState } from 'react';
import { useMomentum } from '../../hooks/useGameState';
import { getSocket } from '../../hooks/useSocket';

const NAMED_SPENDS = [
  { label: 'Obtain Information', cost: 1, reason: 'Obtain Information' },
  { label: 'Extra Minor Action', cost: 1, reason: 'Extra Minor Action' },
  { label: 'Disarm (1-handed)', cost: 1, reason: 'Disarm (1-handed)' },
  { label: 'Create Trait', cost: 2, reason: null },   // null = prompts for name
  { label: 'Swift Action (+1 Difficulty)', cost: 2, reason: 'Swift Action' },
  { label: 'Keep Initiative', cost: 2, reason: 'Keep Initiative' },
  { label: 'Reduce Time', cost: 2, reason: 'Reduce Time' },
  { label: 'Added Severity (combat, max +2)', cost: 2, reason: 'Added Severity' },
  { label: 'Disarm (2-handed)', cost: 2, reason: 'Disarm (2-handed)' },
] as const;

export default function MomentumSpendMenu() {
  const momentum = useMomentum();
  const [traitName, setTraitName] = useState('');
  const [showTraitInput, setShowTraitInput] = useState(false);

  const spend = (amount: number, reason: string) => {
    if (momentum < amount) return;
    getSocket().emit('spend-momentum', { amount, reason }, (r) => {
      if ('error' in r) console.warn(r.error);
    });
  };

  const spendCreateTrait = () => {
    if (!traitName.trim()) return;
    spend(2, `Create Trait: "${traitName.trim()}"`);
    getSocket().emit('create-scene-trait', { text: traitName.trim() }, (r) => {
      if ('error' in r) console.warn(r.error);
    });
    setTraitName('');
    setShowTraitInput(false);
  };

  return (
    <div className="mt-2 space-y-1 border-t border-gray-700 pt-2">
      <div className="lcars-label text-xs mb-1">Named Spends</div>
      {NAMED_SPENDS.map((s) => {
        if (s.reason === null) {
          return (
            <div key={s.label}>
              {showTraitInput ? (
                <div className="flex gap-1">
                  <input
                    className="lcars-input text-xs py-0.5 flex-1"
                    placeholder="Trait name…"
                    value={traitName}
                    onChange={(e) => setTraitName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && spendCreateTrait()}
                    autoFocus
                  />
                  <button className="lcars-btn-amber text-xs px-2" onClick={spendCreateTrait}>−2⚡</button>
                  <button className="lcars-btn-ghost text-xs px-1" onClick={() => setShowTraitInput(false)}>✕</button>
                </div>
              ) : (
                <button
                  className="w-full text-left flex justify-between items-center px-2 py-1 rounded text-xs border border-gray-700 hover:border-lcars-gold disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={momentum < s.cost}
                  onClick={() => setShowTraitInput(true)}
                >
                  <span>{s.label}</span>
                  <span className="text-lcars-gold">−{s.cost}⚡</span>
                </button>
              )}
            </div>
          );
        }
        return (
          <button
            key={s.label}
            className="w-full text-left flex justify-between items-center px-2 py-1 rounded text-xs border border-gray-700 hover:border-lcars-gold disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={momentum < s.cost}
            onClick={() => spend(s.cost, s.reason)}
          >
            <span>{s.label}</span>
            <span className="text-lcars-gold">−{s.cost}⚡</span>
          </button>
        );
      })}
    </div>
  );
}
