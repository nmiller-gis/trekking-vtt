import { useMyCharacter, usePlayerShip, useEnemyShips } from '../../hooks/useGameState';
import { useRoller } from '../../hooks/useRoller';

export default function ScienceStation() {
  const character = useMyCharacter();
  const ship = usePlayerShip();
  const enemyShips = useEnemyShips();
  const { rollTask } = useRoller();

  const revealedEnemies = Object.values(enemyShips).filter((e) => e.isRevealed);
  const contacts = Object.values(enemyShips).filter((e) => !e.isRevealed);

  const rollSensorSweep = () => {
    if (!ship) return;
    rollTask({
      numDice: 2,
      targetNumber: ship.systems.sensors + ship.departments.science,
      difficulty: 2,
      isFocusApplied: false,
      label: 'Sensor Sweep',
      attributeUsed: 'sensors',
      disciplineUsed: 'science',
    });
  };

  const rollScanForWeakness = (targetName: string) => {
    if (!ship) return;
    rollTask({
      numDice: 2,
      targetNumber: ship.systems.sensors + ship.departments.science,
      difficulty: 2,
      isFocusApplied: false,
      label: `Scan for Weakness — ${targetName}`,
      attributeUsed: 'sensors',
      disciplineUsed: 'science',
    });
  };

  const rollAnalyze = (label: string) => {
    if (!ship) return;
    rollTask({
      numDice: 2,
      targetNumber: ship.systems.sensors + ship.departments.science,
      difficulty: 1,
      isFocusApplied: false,
      label: `Analyze — ${label}`,
      attributeUsed: 'sensors',
      disciplineUsed: 'science',
    });
  };

  const rollPersonalScience = () => {
    if (!character) return;
    rollTask({
      numDice: 2,
      targetNumber: character.attributes.reason + character.disciplines.science,
      difficulty: 1,
      isFocusApplied: false,
      label: 'Scientific Analysis (personal)',
      attributeUsed: 'reason',
      disciplineUsed: 'science',
    });
  };

  return (
    <div className="station-panel space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-8 bg-lcars-purple rounded-full" />
        <div>
          <div className="lcars-header">Science Station</div>
          {character && <div className="text-xs text-gray-400">{character.name}</div>}
        </div>
      </div>

      {/* Sensor display */}
      {ship && (
        <div className="lcars-panel p-3">
          <div className="lcars-label mb-2">Sensor Array</div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div>
              <div className="text-2xl font-bold text-lcars-purple">{ship.systems.sensors}</div>
              <div className="text-gray-500">Sensors</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-lcars-blue">{ship.systems.computers}</div>
              <div className="text-gray-500">Computers</div>
            </div>
          </div>
        </div>
      )}

      {/* Sensor contacts */}
      {(revealedEnemies.length > 0 || contacts.length > 0) && (
        <div>
          <div className="lcars-header mb-2">Sensor Contacts ({revealedEnemies.length + contacts.length})</div>
          <div className="space-y-1">
            {contacts.map((c) => (
              <div key={c.id} className="flex justify-between items-center p-2 border border-lcars-blue rounded text-xs">
                <div>
                  <span className="text-lcars-blue lcars-blink">◈ </span>
                  <span className="text-gray-300">{c.contactDesignation}</span>
                </div>
                <button
                  className="lcars-btn text-xs px-2 py-0.5 bg-lcars-purple text-white"
                  onClick={() => rollAnalyze(c.contactDesignation)}
                >
                  Analyze
                </button>
              </div>
            ))}
            {revealedEnemies.map((e) => (
              <div key={e.id} className="p-2 border border-gray-700 rounded text-xs">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-white font-bold">{e.name}</span>
                  <div className="flex gap-1 text-gray-500">
                    <span>Hull {e.hullIntegrity.current}/{e.hullIntegrity.max}</span>
                    <span>·</span>
                    <span>Shld {e.shields.current}</span>
                  </div>
                </div>
                {e.weaknessScanned && (
                  <div className="text-lcars-gold text-xs">⚡ Weakness identified (−{e.difficultyReduction} difficulty)</div>
                )}
                <button
                  className="lcars-btn text-xs px-2 py-0.5 mt-1 bg-lcars-purple text-white"
                  onClick={() => rollScanForWeakness(e.name)}
                >
                  Scan for Weakness
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Science actions */}
      <div>
        <div className="lcars-header mb-2">Science Actions</div>
        <div className="space-y-2">
          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-purple text-white"
            onClick={rollSensorSweep}
            disabled={!ship}
          >
            <div className="font-bold">Sensor Sweep</div>
            <div className="text-xs opacity-70">Sensors + Science — gather information on area</div>
          </button>

          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-panel border border-lcars-purple text-lcars-purple hover:bg-lcars-purple hover:text-white"
            onClick={() => rollScanForWeakness('current target')}
            disabled={!ship}
          >
            <div className="font-bold">Scan for Weakness</div>
            <div className="text-xs opacity-70">Sensors + Science D2 — reduce attack difficulty on success</div>
          </button>

          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-panel border border-gray-600 text-gray-300 hover:border-lcars-purple"
            onClick={rollPersonalScience}
            disabled={!character}
          >
            <div className="font-bold">Personal Analysis</div>
            <div className="text-xs opacity-70">Reason + Science — character-level science task</div>
          </button>
        </div>
      </div>
    </div>
  );
}
