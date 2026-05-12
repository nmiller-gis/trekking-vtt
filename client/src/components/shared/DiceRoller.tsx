import { useState } from 'react';
import { AttributeKey, DisciplineKey, extraDiceCost } from '@lcars-vtt/shared';
import { useRoller } from '../../hooks/useRoller';
import { useMomentum, useMyCharacter, useCharacters, usePlayers } from '../../hooks/useGameState';
import { useUIStore } from '../../store/uiStore';
import { getSocket } from '../../hooks/useSocket';

const ATTRIBUTES: AttributeKey[] = ['control', 'daring', 'fitness', 'insight', 'presence', 'reason'];
const DISCIPLINES: DisciplineKey[] = ['command', 'conn', 'engineering', 'medicine', 'science', 'security'];

const ATTR_COLORS: Record<AttributeKey, string> = {
  control: 'bg-lcars-blue', daring: 'bg-lcars-amber', fitness: 'bg-lcars-red',
  insight: 'bg-lcars-purple', presence: 'bg-lcars-gold', reason: 'bg-lcars-peach',
};

type Mode = 'task' | 'challenge';

export default function DiceRoller() {
  const { rollTask, rollChallenge } = useRoller();
  const momentum = useMomentum();
  const myChar = useMyCharacter();
  const players = usePlayers();
  const characters = useCharacters();
  const { pendingPerfectOpportunity, setPendingPerfectOpportunity, pendingAssist, setPendingAssist } = useUIStore();

  const [mode, setMode] = useState<Mode>('task');
  const [selectedAttr, setSelectedAttr] = useState<AttributeKey | null>(null);
  const [selectedDisc, setSelectedDisc] = useState<DisciplineKey | null>(null);
  const [difficulty, setDifficulty] = useState(1);
  const [extraDice, setExtraDice] = useState(0);
  const [focusApplied, setFocusApplied] = useState(false);
  const [label, setLabel] = useState('');
  const [numChallenge, setNumChallenge] = useState(2);
  const [isAssistMode, setIsAssistMode] = useState(false);
  const [assistTargetCharId, setAssistTargetCharId] = useState<string>('');

  const attrValue = myChar && selectedAttr ? myChar.attributes[selectedAttr] : 0;
  const discValue = myChar && selectedDisc ? myChar.disciplines[selectedDisc] : 0;
  const targetNumber = attrValue + discValue;
  const totalDice = 2 + extraDice;

  const canRoll = mode === 'task'
    ? selectedAttr !== null && selectedDisc !== null && targetNumber > 0
    : numChallenge > 0;

  const handleTaskRoll = () => {
    if (!canRoll || mode !== 'task') return;
    const fixedDice = pendingPerfectOpportunity ? [1] : undefined;
    if (pendingPerfectOpportunity) setPendingPerfectOpportunity(false);
    rollTask({
      numDice: totalDice,
      targetNumber,
      difficulty,
      isFocusApplied: focusApplied,
      focusThreshold: discValue,
      label: label || (isAssistMode ? `Assisting (${selectedAttr} + ${selectedDisc})` : `${selectedAttr} + ${selectedDisc}`),
      attributeUsed: selectedAttr ?? '',
      disciplineUsed: selectedDisc ?? '',
      fixedDice,
      isAssist: isAssistMode || undefined,
      assistTargetCharId: (isAssistMode && assistTargetCharId) ? assistTargetCharId : undefined,
    });
  };

  const acceptAssist = () => {
    if (!pendingAssist) return;
    getSocket().emit('accept-assist', { fromPlayerId: pendingAssist.fromPlayerId }, (r) => {
      if ('error' in r) { console.warn(r.error); return; }
      setExtraDice(Math.min(3, r.bonusDice));
      setPendingAssist(null);
    });
  };

  const declineAssist = () => {
    if (!pendingAssist) return;
    getSocket().emit('decline-assist', { fromPlayerId: pendingAssist.fromPlayerId });
    setPendingAssist(null);
  };

  const handleChallengeRoll = () => {
    if (mode !== 'challenge') return;
    rollChallenge(numChallenge, label || 'Challenge roll');
  };

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto">
      {/* Mode toggle */}
      <div className="flex gap-1">
        <button
          className={`flex-1 lcars-btn text-xs py-1 ${mode === 'task' ? 'bg-lcars-amber text-black' : 'lcars-btn-ghost'}`}
          onClick={() => setMode('task')}
        >
          Task Roll (2d20)
        </button>
        <button
          className={`flex-1 lcars-btn text-xs py-1 ${mode === 'challenge' ? 'bg-lcars-purple text-white' : 'lcars-btn-ghost'}`}
          onClick={() => setMode('challenge')}
        >
          Challenge Dice
        </button>
      </div>

      {mode === 'task' ? (
        <>
          {/* Attributes */}
          <div>
            <div className="lcars-label mb-1">Attribute</div>
            <div className="grid grid-cols-3 gap-1">
              {ATTRIBUTES.map((attr) => {
                const val = myChar ? myChar.attributes[attr] : '?';
                return (
                  <button
                    key={attr}
                    className={`text-xs px-2 py-1.5 rounded uppercase transition-all
                      ${selectedAttr === attr
                        ? `${ATTR_COLORS[attr]} text-black font-bold`
                        : 'bg-lcars-panel border border-gray-700 hover:border-lcars-amber'}`}
                    onClick={() => setSelectedAttr(selectedAttr === attr ? null : attr)}
                  >
                    {attr} {val}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Disciplines */}
          <div>
            <div className="lcars-label mb-1">Discipline</div>
            <div className="grid grid-cols-3 gap-1">
              {DISCIPLINES.map((disc) => {
                const val = myChar ? myChar.disciplines[disc] : '?';
                return (
                  <button
                    key={disc}
                    className={`text-xs px-2 py-1.5 rounded uppercase transition-all
                      ${selectedDisc === disc
                        ? 'bg-lcars-blue text-black font-bold'
                        : 'bg-lcars-panel border border-gray-700 hover:border-lcars-blue'}`}
                    onClick={() => setSelectedDisc(selectedDisc === disc ? null : disc)}
                  >
                    {disc} {val}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target number display */}
          {selectedAttr && selectedDisc && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Target:</span>
              <span className="text-lcars-gold font-bold text-lg">{targetNumber}</span>
              <span className="text-gray-600">({attrValue} + {discValue})</span>
            </div>
          )}

          {/* Difficulty */}
          <div className="flex items-center gap-2">
            <span className="lcars-label">Difficulty:</span>
            {[0, 1, 2, 3, 4, 5].map((d) => (
              <button
                key={d}
                className={`w-7 h-7 rounded text-xs font-bold transition-all
                  ${difficulty === d ? 'bg-lcars-amber text-black' : 'bg-lcars-panel border border-gray-700 hover:border-lcars-amber'}`}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Extra dice from momentum */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="lcars-label">Extra dice:</span>
            {[0, 1, 2, 3].map((n) => {
              const cost = extraDiceCost(n);
              const affordable = cost <= momentum;
              return (
                <button
                  key={n}
                  disabled={!affordable}
                  className={`px-2 h-7 rounded text-xs font-bold transition-all
                    ${extraDice === n ? 'bg-lcars-gold text-black' : 'bg-lcars-panel border border-gray-700'}
                    ${!affordable ? 'opacity-30 cursor-not-allowed' : 'hover:border-lcars-gold'}`}
                  onClick={() => setExtraDice(n)}
                  title={n > 0 ? `Costs ${cost} momentum` : 'No extra dice'}
                >
                  {n === 0 ? '0' : `+${n} (${cost}⚡)`}
                </button>
              );
            })}
            <span className="text-xs text-gray-500">({momentum}/6)</span>
          </div>

          {/* Focus */}
          {myChar && (
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                  ${focusApplied ? 'bg-lcars-gold border-lcars-gold' : 'border-gray-600'}`}
                onClick={() => setFocusApplied(!focusApplied)}
              >
                {focusApplied && <span className="text-black text-xs">✓</span>}
              </div>
              <span className="text-xs uppercase text-gray-400">Apply Focus (1s and {discValue}s = 2 successes)</span>
            </label>
          )}

          {/* Assist mode */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                ${isAssistMode ? 'bg-lcars-purple border-lcars-purple' : 'border-gray-600'}`}
              onClick={() => setIsAssistMode(!isAssistMode)}
            >
              {isAssistMode && <span className="text-white text-xs">✓</span>}
            </div>
            <span className="text-xs uppercase text-gray-400">Rolling to Assist another character</span>
          </label>

          {isAssistMode && (
            <select
              className="lcars-input text-xs py-1"
              value={assistTargetCharId}
              onChange={(e) => setAssistTargetCharId(e.target.value)}
            >
              <option value="">— Select target character —</option>
              {Object.values(players)
                .filter((p) => p.characterId && p.characterId !== myChar?.id)
                .map((p) => {
                  const char = characters[p.characterId!];
                  return char ? (
                    <option key={char.id} value={char.id}>{char.name} ({p.name})</option>
                  ) : null;
                })}
            </select>
          )}

          {/* Pending assist banner */}
          {pendingAssist && (
            <div className="text-xs border border-lcars-gold rounded px-2 py-1.5 flex justify-between items-center bg-lcars-panel/50">
              <span className="text-lcars-gold">Assist from {pendingAssist.fromPlayerName} (+{pendingAssist.bonusDice} dice)</span>
              <div className="flex gap-1">
                <button className="lcars-btn-amber text-xs px-2 py-0.5" onClick={acceptAssist}>Accept</button>
                <button className="lcars-btn-ghost text-xs px-2 py-0.5" onClick={declineAssist}>Decline</button>
              </div>
            </div>
          )}

          {/* Perfect Opportunity indicator */}
          {pendingPerfectOpportunity && (
            <div className="text-xs text-lcars-gold border border-lcars-gold rounded px-2 py-1 flex justify-between">
              <span>⭐ Perfect Opportunity — one die auto-sets to 1</span>
              <button className="text-gray-500 hover:text-white" onClick={() => setPendingPerfectOpportunity(false)}>✕</button>
            </div>
          )}

          {/* Total dice display */}
          <div className="text-xs text-gray-500">
            Rolling {totalDice}d20{extraDice > 0 && ` (−${extraDiceCost(extraDice)} momentum)`}
          </div>
        </>
      ) : (
        /* Challenge dice mode */
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="lcars-label">Dice count:</span>
            <button className="lcars-btn-ghost text-xs px-2 py-1" onClick={() => setNumChallenge(Math.max(1, numChallenge - 1))}>−</button>
            <span className="text-lcars-purple text-xl font-bold w-8 text-center">{numChallenge}</span>
            <button className="lcars-btn-ghost text-xs px-2 py-1" onClick={() => setNumChallenge(Math.min(20, numChallenge + 1))}>+</button>
          </div>
          <div className="text-xs text-gray-500">Faces: 1, 2, blank, blank, blank, ⚡effect</div>
        </div>
      )}

      {/* Label */}
      <div>
        <input
          className="lcars-input text-xs py-1"
          placeholder="Roll label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (mode === 'task' ? handleTaskRoll() : handleChallengeRoll())}
        />
      </div>

      {/* Roll button */}
      <button
        className={`lcars-btn w-full ${canRoll ? 'bg-lcars-amber text-black' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
        disabled={!canRoll}
        onClick={mode === 'task' ? handleTaskRoll : handleChallengeRoll}
      >
        Roll {mode === 'task' ? `${totalDice}d20` : `${numChallenge}[CD]`}
      </button>
    </div>
  );
}
