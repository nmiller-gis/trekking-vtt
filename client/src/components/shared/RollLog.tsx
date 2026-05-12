import { useState } from 'react';
import { useRollLog, useMyPlayerId } from '../../hooks/useGameState';
import { useUIStore } from '../../store/uiStore';
import { RollResult, TaskRollResult, ChallengeRollResult } from '@lcars-vtt/shared';
import { getSocket } from '../../hooks/useSocket';

function TaskEntry({ d }: { d: TaskRollResult }) {
  const outcome = d.isSuccess
    ? d.complications > 0 ? '⚠ SUCCESS WITH COMPLICATION' : '✓ SUCCESS'
    : d.complications > 0 ? '✗ FAILURE WITH COMPLICATION' : '✗ FAILURE';
  const outcomeColor = d.isSuccess ? 'text-lcars-gold' : 'text-lcars-red';

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-1">
        {d.dice.map((die, i) => {
          const isSuccess = die <= d.targetNumber;
          const isCrit = die === 1;
          const isComplication = die >= 20;
          return (
            <span
              key={i}
              className={`text-xs px-1.5 py-0.5 rounded font-bold
                ${isCrit ? 'bg-lcars-gold text-black' :
                  isComplication ? 'bg-lcars-red text-white' :
                  isSuccess ? 'bg-lcars-blue text-black' :
                  'bg-gray-700 text-gray-400'}`}
            >
              {die}
            </span>
          );
        })}
        <span className="text-xs text-gray-500">TN {d.targetNumber} / D{d.difficulty}</span>
      </div>
      <div className="flex gap-3 text-xs">
        <span className={outcomeColor}>{outcome}</span>
        {d.successes > 0 && <span className="text-gray-400">{d.successes} success{d.successes !== 1 ? 'es' : ''}</span>}
        {d.momentum > 0 && <span className="text-lcars-gold">+{d.momentum} momentum</span>}
        {d.complications > 0 && <span className="text-lcars-red">{d.complications} complication{d.complications !== 1 ? 's' : ''}</span>}
      </div>
      {(d.attributeUsed || d.disciplineUsed) && (
        <div className="text-xs text-gray-600 mt-0.5">
          {d.attributeUsed} + {d.disciplineUsed}
          {d.isFocusApplied && ' (focus applied)'}
        </div>
      )}
    </div>
  );
}

function ChallengeEntry({ d }: { d: ChallengeRollResult }) {
  const faceIcon = (face: string) =>
    face === 'one' ? '1' : face === 'two' ? '2' : face === 'effect' ? '⚡' : '—';

  return (
    <div>
      <div className="flex gap-1 flex-wrap mb-1">
        {d.challengeDice.map((die, i) => (
          <span
            key={i}
            className={`text-xs px-1.5 py-0.5 rounded font-bold
              ${die.face === 'effect' ? 'bg-lcars-purple text-white' :
                die.damage > 0 ? 'bg-lcars-amber text-black' :
                'bg-gray-700 text-gray-400'}`}
          >
            {faceIcon(die.face)}
          </span>
        ))}
      </div>
      <div className="flex gap-3 text-xs">
        <span className="text-lcars-amber">{d.totalDamage} damage</span>
        {d.effectCount > 0 && <span className="text-lcars-purple">{d.effectCount} effect{d.effectCount !== 1 ? 's' : ''}</span>}
      </div>
    </div>
  );
}

function RerollUI({ result }: { result: RollResult }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { setPendingMomentOfInspiration } = useUIStore();

  if (result.details.type !== 'task') return null;
  const dice = result.details.dice;

  const toggle = (i: number) => setSelected((s) => {
    const next = new Set(s);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const confirm = () => {
    if (selected.size === 0) return;
    getSocket().emit('dice-reroll', { rollId: result.id, diceIndices: [...selected] }, (r) => {
      if ('error' in r) console.warn(r.error);
    });
    setPendingMomentOfInspiration(false);
  };

  return (
    <div className="mt-1 p-2 border border-lcars-gold rounded bg-lcars-panel/50">
      <div className="text-xs text-lcars-gold mb-1">Select dice to reroll:</div>
      <div className="flex gap-1 flex-wrap mb-2">
        {dice.map((die, i) => (
          <button
            key={i}
            className={`text-xs px-1.5 py-0.5 rounded font-bold border-2 transition-all
              ${selected.has(i) ? 'border-lcars-gold bg-lcars-gold text-black' : 'border-gray-600 text-gray-300'}`}
            onClick={() => toggle(i)}
          >
            {die}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <button
          className="lcars-btn-amber text-xs px-3 py-1 disabled:opacity-30"
          disabled={selected.size === 0}
          onClick={confirm}
        >
          Reroll ({selected.size})
        </button>
        <button className="lcars-btn-ghost text-xs px-2" onClick={() => setPendingMomentOfInspiration(false)}>Cancel</button>
      </div>
    </div>
  );
}

function RollEntry({ result, showReroll }: { result: RollResult; showReroll: boolean }) {
  const time = new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="border-b border-lcars-border pb-2 mb-2 last:border-0 last:mb-0">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-lcars-amber text-xs font-bold uppercase">{result.playerName}</span>
        <span className="text-gray-600 text-xs">{time}</span>
      </div>
      {result.label && <div className="text-xs text-lcars-blue uppercase tracking-wider mb-1">{result.label}</div>}
      {result.details.type === 'task'
        ? <TaskEntry d={result.details} />
        : <ChallengeEntry d={result.details} />}
      {showReroll && <RerollUI result={result} />}
    </div>
  );
}

export default function RollLog() {
  const log = useRollLog();
  const myPlayerId = useMyPlayerId();
  const { pendingMomentOfInspiration } = useUIStore();

  // Find the most recent task roll by this player for Moment of Inspiration
  const rerollTargetId = pendingMomentOfInspiration
    ? log.find((r) => r.playerId === myPlayerId && r.details.type === 'task')?.id ?? null
    : null;

  return (
    <div className="h-full flex flex-col">
      <div className="lcars-label mb-2">Roll Log</div>
      <div className="flex-1 overflow-y-auto space-y-0">
        {log.length === 0 ? (
          <div className="text-gray-600 text-xs uppercase">No rolls yet</div>
        ) : (
          log.map((r) => (
            <RollEntry
              key={r.id}
              result={r}
              showReroll={r.id === rerollTargetId}
            />
          ))
        )}
      </div>
    </div>
  );
}
