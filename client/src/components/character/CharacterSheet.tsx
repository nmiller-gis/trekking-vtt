import { useState } from 'react';
import { Character, DetermSpend } from '@lcars-vtt/shared';
import { getSocket } from '../../hooks/useSocket';
import { useUIStore } from '../../store/uiStore';
import { useRollLog, useMyPlayerId, useDirectives } from '../../hooks/useGameState';
import AttributeDisciplineGrid from './AttributeDisciplineGrid';

interface Props {
  character: Character;
  editable?: boolean;
  onCreateNew?: () => void;
}

export default function CharacterSheet({ character, editable = false, onCreateNew }: Props) {
  const [char, setChar] = useState<Character>(character);
  const { setPendingPerfectOpportunity, setPendingMomentOfInspiration } = useUIStore();
  const rollLog = useRollLog();
  const myPlayerId = useMyPlayerId();
  const directives = useDirectives();

  // Keep local state in sync when server broadcasts updates
  if (character.id === char.id && character !== char &&
      JSON.stringify(character) !== JSON.stringify(char)) {
    setChar(character);
  }

  const update = (updates: Partial<Character>) => {
    const updated = { ...char, ...updates };
    setChar(updated);
    getSocket().emit('update-character', { character: updated });
  };

  const adjustStress = (delta: number) => {
    const next = Math.max(0, Math.min(char.stress.max, char.stress.current + delta));
    update({ stress: { ...char.stress, current: next } });
  };

  // Determination spending
  const [showDetSpend, setShowDetSpend] = useState(false);

  const spendDetermination = (type: DetermSpend) => {
    getSocket().emit('spend-determination', { characterId: char.id, type }, (r) => {
      if ('error' in r) { console.warn(r.error); return; }
      if (type === 'perfect-opportunity') {
        setPendingPerfectOpportunity(true);
      } else if (type === 'moment-of-inspiration') {
        // Find most recent task roll by this player to target the reroll UI
        const hasRoll = rollLog.some((r) => r.playerId === myPlayerId && r.details.type === 'task');
        if (hasRoll) setPendingMomentOfInspiration(true);
      }
    });
    setShowDetSpend(false);
  };

  // Values — use proper socket events for mechanical effect
  const invokeValue = (idx: number) => {
    getSocket().emit('invoke-value', { characterId: char.id, valueIndex: idx }, (r) => {
      if ('error' in r) console.warn(r.error);
    });
  };

  const challengeValue = (idx: number) => {
    getSocket().emit('challenge-value', { characterId: char.id, valueIndex: idx }, (r) => {
      if ('error' in r) console.warn(r.error);
    });
  };

  // Directives
  const invokeDirective = (directiveId: string) => {
    getSocket().emit('invoke-directive', { directiveId, characterId: char.id }, (r) => {
      if ('error' in r) console.warn(r.error);
    });
  };

  const challengeDirective = (directiveId: string) => {
    getSocket().emit('challenge-directive', { directiveId, characterId: char.id }, (r) => {
      if ('error' in r) console.warn(r.error);
    });
  };

  // Injuries
  const [showAddInjury, setShowAddInjury] = useState(false);
  const [injuryDesc, setInjuryDesc] = useState('');
  const [injurySeverity, setInjurySeverity] = useState<'stun' | 'deadly'>('stun');

  const sufferInjury = () => {
    if (!injuryDesc.trim()) return;
    getSocket().emit('suffer-injury', { characterId: char.id, description: injuryDesc.trim(), severity: injurySeverity });
    setInjuryDesc('');
    setShowAddInjury(false);
  };

  const avoidInjury = (injuryId: string, stressCost: number) => {
    getSocket().emit('avoid-injury', { characterId: char.id, injuryId, stressCost });
  };

  const treatInjury = (injuryId: string) => {
    getSocket().emit('treat-injury', { characterId: char.id, injuryId });
  };

  const injuries = char.injuries ?? [];

  return (
    <div className="h-full flex flex-col overflow-y-auto space-y-4">
      {/* Header */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-lcars-amber font-bold text-lg uppercase">{char.name}</span>
        <span className="text-gray-400 text-sm">{char.rank} · {char.role}</span>
        <span className="text-gray-600 text-xs ml-auto">{char.species}</span>
      </div>

      {/* Stress + Determination */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="lcars-label mb-1">Stress ({char.stress.current}/{char.stress.max})</div>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: char.stress.max }, (_, i) => (
              <button
                key={i}
                className={`w-6 h-6 rounded transition-all
                  ${i < char.stress.current
                    ? 'bg-lcars-red border-lcars-red'
                    : 'bg-transparent border border-gray-600'}
                  ${editable ? 'cursor-pointer hover:border-lcars-red' : ''}`}
                onClick={() => editable && adjustStress(i < char.stress.current ? -1 : 1)}
              />
            ))}
          </div>
          <div className="flex gap-1 mt-1">
            <button className="lcars-btn-ghost text-xs px-1.5 py-0.5" onClick={() => adjustStress(-1)}>−</button>
            <button className="lcars-btn-ghost text-xs px-1.5 py-0.5" onClick={() => adjustStress(1)}>+</button>
          </div>
        </div>

        <div>
          <div className="lcars-label mb-1">Determination</div>
          <div className="flex gap-1 mb-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full border-2 ${i < char.determination
                  ? 'bg-lcars-gold border-lcars-gold'
                  : 'border-gray-600'}`}
              />
            ))}
          </div>
          {editable && char.determination > 0 && (
            showDetSpend ? (
              <div className="space-y-1">
                <button
                  className="block w-full text-left text-xs px-2 py-1 border border-lcars-gold rounded hover:bg-lcars-gold hover:text-black"
                  onClick={() => spendDetermination('moment-of-inspiration')}
                >
                  Moment of Inspiration — reroll dice
                </button>
                <button
                  className="block w-full text-left text-xs px-2 py-1 border border-lcars-gold rounded hover:bg-lcars-gold hover:text-black"
                  onClick={() => spendDetermination('perfect-opportunity')}
                >
                  Perfect Opportunity — set one die to 1
                </button>
                <button
                  className="block w-full text-left text-xs px-2 py-1 border border-lcars-gold rounded hover:bg-lcars-gold hover:text-black"
                  onClick={() => spendDetermination('special-technique')}
                >
                  Special Technique — use a talent you lack
                </button>
                <button className="text-xs text-gray-500" onClick={() => setShowDetSpend(false)}>Cancel</button>
              </div>
            ) : (
              <button
                className="lcars-btn text-xs px-2 py-0.5 bg-lcars-panel border border-lcars-gold text-lcars-gold hover:bg-lcars-gold hover:text-black"
                onClick={() => setShowDetSpend(true)}
              >
                Spend Determination
              </button>
            )
          )}
          <div className="text-xs text-gray-500 mt-1">Resistance: {char.resistance}</div>
        </div>
      </div>

      {/* Injuries */}
      {(injuries.length > 0 || editable) && (
        <div>
          <div className="lcars-header mb-2">Injuries</div>
          {injuries.map((injury) => (
            <div key={injury.id} className={`flex items-center gap-2 p-2 mb-1 rounded border text-xs
              ${injury.severity === 'deadly' ? 'border-lcars-red bg-lcars-red/10' : 'border-lcars-amber bg-lcars-amber/10'}`}>
              <span className={`font-bold uppercase ${injury.severity === 'deadly' ? 'text-lcars-red' : 'text-lcars-amber'}`}>
                {injury.severity}
              </span>
              <span className="flex-1 text-gray-300">{injury.description}</span>
              {editable && (
                <>
                  <button
                    className="lcars-btn-ghost text-xs px-2 py-0.5"
                    onClick={() => avoidInjury(injury.id, injury.severity === 'deadly' ? 4 : 2)}
                    title={`Spend ${injury.severity === 'deadly' ? 4 : 2} Stress to avoid`}
                  >
                    Avoid (−{injury.severity === 'deadly' ? 4 : 2} Stress)
                  </button>
                  <button
                    className="lcars-btn-ghost text-xs px-2 py-0.5"
                    onClick={() => treatInjury(injury.id)}
                  >
                    Treated
                  </button>
                </>
              )}
            </div>
          ))}
          {editable && !showAddInjury && (
            <button className="text-xs text-gray-500 hover:text-lcars-red" onClick={() => setShowAddInjury(true)}>
              + Suffer Injury
            </button>
          )}
          {showAddInjury && (
            <div className="flex gap-2 items-center mt-1">
              <input
                className="lcars-input text-xs py-1 flex-1"
                placeholder="Injury description…"
                value={injuryDesc}
                onChange={(e) => setInjuryDesc(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sufferInjury()}
                autoFocus
              />
              <button
                className={`lcars-btn text-xs px-2 py-1 border ${injurySeverity === 'stun' ? 'bg-lcars-amber text-black' : 'border-lcars-amber text-lcars-amber'}`}
                onClick={() => setInjurySeverity('stun')}
              >Stun</button>
              <button
                className={`lcars-btn text-xs px-2 py-1 border ${injurySeverity === 'deadly' ? 'bg-lcars-red text-white' : 'border-lcars-red text-lcars-red'}`}
                onClick={() => setInjurySeverity('deadly')}
              >Deadly</button>
              <button className="lcars-btn-red text-xs px-2" onClick={sufferInjury}>Add</button>
              <button className="lcars-btn-ghost text-xs px-2" onClick={() => setShowAddInjury(false)}>✕</button>
            </div>
          )}
        </div>
      )}

      {/* Attribute × Discipline grid */}
      <div>
        <div className="lcars-header mb-2">Task Roll Table</div>
        <AttributeDisciplineGrid character={char} />
      </div>

      {/* Values */}
      <div>
        <div className="lcars-header mb-2">Values</div>
        <div className="space-y-1">
          {char.values.map((v, i) => (
            <div key={i} className={`p-2 rounded border text-xs flex justify-between items-center
              ${v.invoked ? 'border-lcars-gold bg-lcars-panel' : 'border-gray-700'}`}>
              <span className={v.invoked ? 'text-lcars-gold line-through opacity-60' : 'text-gray-300'}>"{v.text}"</span>
              {editable && (
                <div className="flex gap-1 shrink-0 ml-2">
                  <button
                    className={`px-1.5 py-0.5 rounded text-xs ${v.invoked ? 'bg-lcars-gold text-black' : 'border border-gray-600 text-gray-500 hover:border-lcars-gold'}`}
                    onClick={() => invokeValue(i)}
                    title="Invoke (spend 1 Determination)"
                    disabled={v.invoked}
                  >
                    Invoke
                  </button>
                  <button
                    className={`px-1.5 py-0.5 rounded text-xs ${v.challenged ? 'bg-lcars-red text-white' : 'border border-gray-600 text-gray-500 hover:border-lcars-red'}`}
                    onClick={() => challengeValue(i)}
                    title="Challenge (gain 1 Determination)"
                    disabled={v.challenged}
                  >
                    Challenge
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Directives (mission-wide values) */}
      {directives.length > 0 && (
        <div>
          <div className="lcars-header mb-2">Directives</div>
          <div className="space-y-1">
            {directives.map((d) => {
              const invoked = d.invokedBy.includes(char.id);
              const challenged = d.challengedBy.includes(char.id);
              return (
                <div key={d.id} className={`p-2 rounded border text-xs flex justify-between items-center
                  ${invoked ? 'border-lcars-blue bg-lcars-panel' : 'border-gray-700'}`}>
                  <span className={invoked ? 'text-lcars-blue line-through opacity-60' : 'text-gray-300'}>"{d.text}"</span>
                  {editable && (
                    <div className="flex gap-1 shrink-0 ml-2">
                      <button
                        className={`px-1.5 py-0.5 rounded text-xs ${invoked ? 'bg-lcars-blue text-black' : 'border border-gray-600 text-gray-500 hover:border-lcars-blue'}`}
                        onClick={() => invokeDirective(d.id)}
                        disabled={invoked}
                        title="Invoke directive (spend 1 Determination)"
                      >Invoke</button>
                      <button
                        className={`px-1.5 py-0.5 rounded text-xs ${challenged ? 'bg-lcars-red text-white' : 'border border-gray-600 text-gray-500 hover:border-lcars-red'}`}
                        onClick={() => challengeDirective(d.id)}
                        disabled={challenged}
                        title="Challenge directive (gain 1 Determination)"
                      >Challenge</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Focuses */}
      <div>
        <div className="lcars-header mb-2">Focuses</div>
        <div className="flex flex-wrap gap-1">
          {char.focuses.map((f, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-lcars-panel border border-lcars-blue text-lcars-blue rounded">{f}</span>
          ))}
        </div>
      </div>

      {/* Talents */}
      {char.talents.length > 0 && (
        <div>
          <div className="lcars-header mb-2">Talents</div>
          <div className="space-y-1">
            {char.talents.map((t) => (
              <div key={t.name} className="text-xs p-2 border border-gray-700 rounded">
                <div className="text-lcars-amber font-bold">{t.name}</div>
                <div className="text-gray-400">{t.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {onCreateNew && (
        <button className="lcars-btn-ghost text-xs" onClick={onCreateNew}>
          + Create New Character
        </button>
      )}
    </div>
  );
}
