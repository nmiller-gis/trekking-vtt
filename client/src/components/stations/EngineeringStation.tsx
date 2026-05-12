import { useMyCharacter, usePlayerShip, useIsGM } from '../../hooks/useGameState';
import { useRoller } from '../../hooks/useRoller';
import { getSocket } from '../../hooks/useSocket';

export default function EngineeringStation() {
  const character = useMyCharacter();
  const ship = usePlayerShip();
  const isGM = useIsGM();
  const { rollTask } = useRoller();

  const rollDamageControl = () => {
    if (!ship) return;
    rollTask({
      numDice: 2,
      targetNumber: ship.systems.engines + ship.departments.engineering,
      difficulty: ship.breaches + 1,
      isFocusApplied: false,
      label: `Damage Control (${ship.breaches} breach${ship.breaches !== 1 ? 'es' : ''})`,
      attributeUsed: 'engines',
      disciplineUsed: 'engineering',
    });
  };

  const rollBoostSystem = (system: string, target: number) => {
    rollTask({
      numDice: 2,
      targetNumber: target,
      difficulty: 2,
      isFocusApplied: false,
      label: `Boost ${system}`,
      attributeUsed: 'engines',
      disciplineUsed: 'engineering',
    });
  };

  const rollEmergencyPower = () => {
    if (!ship) return;
    rollTask({
      numDice: 2,
      targetNumber: ship.systems.engines + ship.departments.engineering,
      difficulty: 2,
      isFocusApplied: false,
      label: 'Emergency Power',
      attributeUsed: 'engines',
      disciplineUsed: 'engineering',
    });
  };

  const rollPersonalRepair = () => {
    if (!character) return;
    rollTask({
      numDice: 2,
      targetNumber: character.attributes.control + character.disciplines.engineering,
      difficulty: 1,
      isFocusApplied: false,
      label: 'Personal Engineering Task',
      attributeUsed: 'control',
      disciplineUsed: 'engineering',
    });
  };

  const adjustPower = (delta: number) => {
    if (!ship || !isGM) return;
    const updated = {
      ...ship,
      power: {
        ...ship.power,
        current: Math.max(0, Math.min(ship.power.max, ship.power.current + delta)),
      },
    };
    getSocket().emit('gm-update-ship', { ship: updated });
  };

  return (
    <div className="station-panel space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-8 bg-lcars-peach rounded-full" />
        <div>
          <div className="lcars-header">Engineering Station</div>
          {character && <div className="text-xs text-gray-400">{character.name}</div>}
        </div>
      </div>

      {/* Power management */}
      {ship && (
        <div className="lcars-panel p-3">
          <div className="lcars-label mb-2">Power Management</div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-3 bg-gray-800 rounded overflow-hidden">
                <div
                  className="h-full bg-lcars-gold transition-all"
                  style={{ width: `${(ship.power.current / ship.power.max) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-lcars-gold font-bold">{ship.power.current}/{ship.power.max}</span>
          </div>
          {isGM && (
            <div className="flex gap-1 mt-2">
              <button className="lcars-btn-ghost text-xs px-2 py-0.5" onClick={() => adjustPower(-1)}>−1</button>
              <button className="lcars-btn-ghost text-xs px-2 py-0.5" onClick={() => adjustPower(1)}>+1</button>
              <button className="lcars-btn text-xs px-2 py-0.5 bg-lcars-gold text-black" onClick={() => adjustPower(ship.power.max)}>Restore</button>
            </div>
          )}
          {!isGM && <div className="text-xs text-gray-600 mt-1">GM controls power allocation</div>}

          {/* System ratings */}
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            {(Object.entries(ship.systems) as [string, number][]).map(([sys, val]) => (
              <div key={sys} className="flex justify-between">
                <span className="text-gray-500 capitalize">{sys}</span>
                <span className="text-lcars-gold font-bold">{String(val).padStart(2, '0')}</span>
              </div>
            ))}
          </div>

          {ship.breaches > 0 && (
            <div className="text-lcars-red text-xs mt-2 lcars-blink">
              ⚠ {ship.breaches} breach{ship.breaches !== 1 ? 'es' : ''} — Damage Control required
            </div>
          )}
        </div>
      )}

      {/* Engineering actions */}
      <div>
        <div className="lcars-header mb-2">Engineering Actions</div>
        <div className="space-y-2">
          <button
            className={`w-full lcars-btn text-left px-3 py-2 ${ship?.breaches ? 'bg-lcars-red text-white' : 'bg-lcars-panel border border-gray-600 text-gray-400'}`}
            onClick={rollDamageControl}
            disabled={!ship}
          >
            <div className="font-bold">Damage Control</div>
            <div className="text-xs opacity-70">
              Engines + Engineering D{ship ? ship.breaches + 1 : '?'} — remove a breach
            </div>
          </button>

          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-peach text-black"
            onClick={rollEmergencyPower}
            disabled={!ship}
          >
            <div className="font-bold">Emergency Power</div>
            <div className="text-xs opacity-70">Engines + Engineering D2 — restore Power</div>
          </button>

          {ship && (
            <>
              <button
                className="w-full lcars-btn text-left px-3 py-2 bg-lcars-panel border border-lcars-peach text-lcars-peach hover:bg-lcars-peach hover:text-black"
                onClick={() => rollBoostSystem('Weapons', ship.systems.engines + ship.departments.engineering)}
                disabled={!ship}
              >
                <div className="font-bold">Boost Weapons</div>
                <div className="text-xs opacity-70">Engines + Engineering D2 — +1 to Weapons system</div>
              </button>

              <button
                className="w-full lcars-btn text-left px-3 py-2 bg-lcars-panel border border-lcars-peach text-lcars-peach hover:bg-lcars-peach hover:text-black"
                onClick={() => rollBoostSystem('Shields', ship.systems.engines + ship.departments.engineering)}
                disabled={!ship}
              >
                <div className="font-bold">Boost Shields</div>
                <div className="text-xs opacity-70">Engines + Engineering D2 — +1 to Structure system</div>
              </button>
            </>
          )}

          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-panel border border-gray-600 text-gray-300 hover:border-lcars-peach"
            onClick={rollPersonalRepair}
            disabled={!character}
          >
            <div className="font-bold">Personal Engineering Task</div>
            <div className="text-xs opacity-70">Control + Engineering — hands-on repair work</div>
          </button>
        </div>
      </div>
    </div>
  );
}
