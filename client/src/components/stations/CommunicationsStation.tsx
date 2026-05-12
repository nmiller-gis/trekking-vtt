import { useMyCharacter, usePlayerShip } from '../../hooks/useGameState';
import { useRoller } from '../../hooks/useRoller';

export default function CommunicationsStation() {
  const character = useMyCharacter();
  const ship = usePlayerShip();
  const { rollTask } = useRoller();

  const rollHail = () => {
    const target = ship
      ? ship.systems.communications + ship.departments.command
      : character
        ? character.attributes.presence + character.disciplines.command
        : 0;
    rollTask({
      numDice: 2,
      targetNumber: target,
      difficulty: 1,
      isFocusApplied: false,
      label: 'Open Hailing Frequencies',
      attributeUsed: ship ? 'communications' : 'presence',
      disciplineUsed: 'command',
    });
  };

  const rollIntercept = () => {
    if (!ship) return;
    rollTask({
      numDice: 2,
      targetNumber: ship.systems.communications + ship.departments.science,
      difficulty: 2,
      isFocusApplied: false,
      label: 'Intercept Signals',
      attributeUsed: 'communications',
      disciplineUsed: 'science',
    });
  };

  const rollElectronicWarfare = () => {
    if (!ship) return;
    rollTask({
      numDice: 2,
      targetNumber: ship.systems.communications + ship.departments.security,
      difficulty: 3,
      isFocusApplied: false,
      label: 'Electronic Warfare — jam enemy comms',
      attributeUsed: 'communications',
      disciplineUsed: 'security',
    });
  };

  const rollTranslate = () => {
    if (!character) return;
    rollTask({
      numDice: 2,
      targetNumber: character.attributes.insight + character.disciplines.science,
      difficulty: 2,
      isFocusApplied: false,
      label: 'Translate / Decode Transmission',
      attributeUsed: 'insight',
      disciplineUsed: 'science',
    });
  };

  const rollDiplomacy = () => {
    if (!character) return;
    rollTask({
      numDice: 2,
      targetNumber: character.attributes.presence + character.disciplines.command,
      difficulty: 2,
      isFocusApplied: false,
      label: 'Diplomatic Communication',
      attributeUsed: 'presence',
      disciplineUsed: 'command',
    });
  };

  return (
    <div className="station-panel space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-8 bg-lcars-gold rounded-full" />
        <div>
          <div className="lcars-header">Communications</div>
          {character && <div className="text-xs text-gray-400">{character.name}</div>}
        </div>
      </div>

      {/* Comms system display */}
      {ship && (
        <div className="lcars-panel p-3">
          <div className="lcars-label mb-2">Communications Array</div>
          <div className="text-center">
            <div className="text-3xl font-bold text-lcars-gold">{ship.systems.communications}</div>
            <div className="text-gray-500 text-xs">Communications Rating</div>
          </div>
        </div>
      )}

      {/* Hailing */}
      <div>
        <div className="lcars-header mb-2">Communications Actions</div>
        <div className="space-y-2">
          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-gold text-black"
            onClick={rollHail}
            disabled={!character && !ship}
          >
            <div className="font-bold">Open Hailing Frequencies</div>
            <div className="text-xs opacity-70">Communications + Command D1 — establish contact</div>
          </button>

          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-panel border border-lcars-gold text-lcars-gold hover:bg-lcars-gold hover:text-black"
            onClick={rollIntercept}
            disabled={!ship}
          >
            <div className="font-bold">Intercept Signals</div>
            <div className="text-xs opacity-70">Communications + Science D2 — monitor enemy transmissions</div>
          </button>

          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-panel border border-lcars-red text-lcars-red hover:bg-lcars-red hover:text-white"
            onClick={rollElectronicWarfare}
            disabled={!ship}
          >
            <div className="font-bold">Electronic Warfare</div>
            <div className="text-xs opacity-70">Communications + Security D3 — jam enemy sensors/comms</div>
          </button>

          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-panel border border-gray-600 text-gray-300 hover:border-lcars-gold"
            onClick={rollTranslate}
            disabled={!character}
          >
            <div className="font-bold">Translate / Decode</div>
            <div className="text-xs opacity-70">Insight + Science D2 — interpret unknown signal</div>
          </button>

          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-panel border border-gray-600 text-gray-300 hover:border-lcars-gold"
            onClick={rollDiplomacy}
            disabled={!character}
          >
            <div className="font-bold">Diplomatic Negotiation</div>
            <div className="text-xs opacity-70">Presence + Command D2 — resolve social conflict via comms</div>
          </button>
        </div>
      </div>
    </div>
  );
}
