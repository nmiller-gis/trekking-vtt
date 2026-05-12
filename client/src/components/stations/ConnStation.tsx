import { useMyCharacter, usePlayerShip } from '../../hooks/useGameState';
import { useRoller } from '../../hooks/useRoller';

export default function ConnStation() {
  const character = useMyCharacter();
  const ship = usePlayerShip();
  const { rollTask } = useRoller();

  const rollManeuver = () => {
    if (!ship) return;
    rollTask({
      numDice: 2,
      targetNumber: ship.systems.engines + ship.departments.conn,
      difficulty: 2,
      isFocusApplied: false,
      label: 'Maneuver',
      attributeUsed: 'engines',
      disciplineUsed: 'conn',
    });
  };

  const rollEvasive = () => {
    if (!ship) return;
    rollTask({
      numDice: 2,
      targetNumber: ship.systems.engines + ship.departments.conn,
      difficulty: 2,
      isFocusApplied: false,
      label: 'Evasive Action',
      attributeUsed: 'engines',
      disciplineUsed: 'conn',
    });
  };

  const rollAttackPattern = () => {
    if (!ship) return;
    rollTask({
      numDice: 2,
      targetNumber: ship.systems.computers + ship.departments.conn,
      difficulty: 2,
      isFocusApplied: false,
      label: 'Attack Pattern (orientation bonus)',
      attributeUsed: 'computers',
      disciplineUsed: 'conn',
    });
  };

  const rollWarpNavigation = () => {
    if (!ship) return;
    rollTask({
      numDice: 2,
      targetNumber: ship.systems.engines + ship.departments.conn,
      difficulty: 1,
      isFocusApplied: false,
      label: 'Navigate to Warp',
      attributeUsed: 'engines',
      disciplineUsed: 'conn',
    });
  };

  return (
    <div className="station-panel space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-8 bg-lcars-blue rounded-full" />
        <div>
          <div className="lcars-header">Conn Station</div>
          {character && <div className="text-xs text-gray-400">{character.name}</div>}
        </div>
      </div>

      {/* Speed/Power display */}
      {ship && (
        <div className="lcars-panel p-3">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <div className="text-2xl font-bold text-lcars-gold">{ship.systems.engines}</div>
              <div className="text-gray-500">Engines</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-lcars-blue">{ship.systems.computers}</div>
              <div className="text-gray-500">Computers</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-lcars-amber">{ship.power.current}/{ship.power.max}</div>
              <div className="text-gray-500">Power</div>
            </div>
          </div>
          <div className="text-center text-xs text-gray-500 mt-1">Scale {ship.scale} · {ship.name}</div>
        </div>
      )}

      {/* Helm actions */}
      <div>
        <div className="lcars-header mb-2">Helm Actions</div>
        <div className="space-y-2">
          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-blue text-black"
            onClick={rollManeuver}
            disabled={!ship}
          >
            <div className="font-bold">Maneuver</div>
            <div className="text-xs opacity-70">Engines + Conn — reposition the ship</div>
          </button>

          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-panel border border-lcars-blue text-lcars-blue hover:bg-lcars-blue hover:text-black"
            onClick={rollEvasive}
            disabled={!ship}
          >
            <div className="font-bold">Evasive Action</div>
            <div className="text-xs opacity-70">Engines + Conn D2 — impose difficulty on enemy attacks</div>
          </button>

          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-panel border border-lcars-amber text-lcars-amber hover:bg-lcars-amber hover:text-black"
            onClick={rollAttackPattern}
            disabled={!ship}
          >
            <div className="font-bold">Attack Pattern</div>
            <div className="text-xs opacity-70">Computers + Conn D2 — create orientation bonus for weapons</div>
          </button>

          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-panel border border-gray-600 text-gray-300 hover:border-lcars-blue"
            onClick={rollWarpNavigation}
            disabled={!ship}
          >
            <div className="font-bold">Navigate to Warp</div>
            <div className="text-xs opacity-70">Engines + Conn — plot and engage warp course</div>
          </button>
        </div>
      </div>

      {!ship && (
        <div className="text-gray-600 text-xs uppercase">Ship not configured — GM must set up the ship</div>
      )}
    </div>
  );
}
