import { useState } from 'react';
import { EnemyShip, Ship } from '@lcars-vtt/shared';
import { useEnemyShips, useIsGM } from '../../hooks/useGameState';
import { getSocket } from '../../hooks/useSocket';

const CONTACT_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let contactIdx = 0;

function nextContactDesignation(): string {
  return `Contact ${CONTACT_LETTERS[contactIdx++ % 26]}`;
}

const defaultEnemy = (): Omit<EnemyShip, 'id'> => ({
  name: 'Unknown Vessel',
  registry: '',
  systems: { communications: 8, computers: 8, engines: 8, sensors: 8, structure: 10, weapons: 10 },
  departments: { command: 2, conn: 2, engineering: 2, medicine: 1, science: 2, security: 3 },
  scale: 4,
  power: { current: 8, max: 8 },
  shields: { current: 18, max: 18 },
  hullIntegrity: { current: 22, max: 22 },
  breaches: 0,
  crewSupport: { current: 4, max: 4 },
  traits: [],
  talents: [],
  weapons: [
    { name: 'Disruptor Cannons', type: 'energy', range: 'medium', damage: 9, qualities: [] },
    { name: 'Photon Torpedoes', type: 'torpedo', range: 'long', damage: 6, qualities: ['highYield'] },
  ],
  isRevealed: false,
  contactDesignation: nextContactDesignation(),
  weaknessScanned: false,
  difficultyReduction: 0,
});

interface EnemyCardProps {
  ship: EnemyShip;
}

function EnemyCard({ ship }: EnemyCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EnemyShip>(ship);

  const update = (updates: Partial<EnemyShip>) => {
    const updated = { ...ship, ...updates };
    getSocket().emit('gm-update-enemy', { ship: updated });
  };

  const reveal = () => {
    getSocket().emit('gm-reveal-contact', { shipId: ship.id });
  };

  const remove = () => {
    getSocket().emit('gm-remove-enemy', { shipId: ship.id });
  };

  const adjustHull = (delta: number) => {
    const current = Math.max(0, Math.min(ship.hullIntegrity.max, ship.hullIntegrity.current + delta));
    update({ hullIntegrity: { ...ship.hullIntegrity, current } });
  };

  const adjustShields = (delta: number) => {
    const current = Math.max(0, Math.min(ship.shields.max, ship.shields.current + delta));
    update({ shields: { ...ship.shields, current } });
  };

  const adjustBreaches = (delta: number) => {
    update({ breaches: Math.max(0, ship.breaches + delta) });
  };

  return (
    <div className={`lcars-panel p-3 border ${ship.isRevealed ? 'border-lcars-red' : 'border-lcars-blue'}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-2">
            {!ship.isRevealed && <span className="text-lcars-blue text-xs lcars-blink">◈ CONTACT</span>}
            <span className="text-white font-bold text-sm">
              {ship.isRevealed ? ship.name : ship.contactDesignation}
            </span>
          </div>
          {ship.isRevealed && ship.registry && (
            <div className="text-gray-500 text-xs">{ship.registry} · Scale {ship.scale}</div>
          )}
        </div>
        <div className="flex gap-1">
          {!ship.isRevealed && (
            <button className="lcars-btn text-xs px-2 py-0.5 bg-lcars-gold text-black" onClick={reveal}>
              Reveal
            </button>
          )}
          <button className="lcars-btn text-xs px-2 py-0.5 bg-gray-700 text-gray-300" onClick={() => setEditing(!editing)}>
            {editing ? 'Done' : 'Edit'}
          </button>
          <button className="lcars-btn text-xs px-2 py-0.5 bg-lcars-red text-white" onClick={remove}>
            ✕
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <button className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-white" onClick={() => adjustShields(-1)}>−</button>
            <span className={`font-bold ${ship.shields.current < ship.shields.max * 0.3 ? 'text-lcars-red' : 'text-lcars-blue'}`}>
              {ship.shields.current}/{ship.shields.max}
            </span>
            <button className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-white" onClick={() => adjustShields(1)}>+</button>
          </div>
          <div className="text-gray-500">Shields</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <button className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-white" onClick={() => adjustHull(-1)}>−</button>
            <span className={`font-bold ${ship.hullIntegrity.current < ship.hullIntegrity.max * 0.4 ? 'text-lcars-red lcars-blink' : 'text-lcars-gold'}`}>
              {ship.hullIntegrity.current}/{ship.hullIntegrity.max}
            </span>
            <button className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-white" onClick={() => adjustHull(1)}>+</button>
          </div>
          <div className="text-gray-500">Hull</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <button className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-white" onClick={() => adjustBreaches(-1)}>−</button>
            <span className={`font-bold ${ship.breaches > 0 ? 'text-lcars-red' : 'text-gray-400'}`}>{ship.breaches}</span>
            <button className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-white" onClick={() => adjustBreaches(1)}>+</button>
          </div>
          <div className="text-gray-500">Breaches</div>
        </div>
      </div>

      {editing && (
        <div className="space-y-2 border-t border-gray-700 pt-2 mt-2">
          <div>
            <label className="lcars-label text-xs block mb-0.5">Name</label>
            <input
              className="lcars-input text-xs py-1"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              onBlur={() => update({ name: draft.name })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="lcars-label text-xs block mb-0.5">Hull Max</label>
              <input
                type="number"
                className="lcars-input text-xs py-1"
                value={draft.hullIntegrity.max}
                onChange={(e) => setDraft({ ...draft, hullIntegrity: { ...draft.hullIntegrity, max: +e.target.value } })}
                onBlur={() => update({ hullIntegrity: { ...ship.hullIntegrity, max: draft.hullIntegrity.max } })}
              />
            </div>
            <div>
              <label className="lcars-label text-xs block mb-0.5">Shields Max</label>
              <input
                type="number"
                className="lcars-input text-xs py-1"
                value={draft.shields.max}
                onChange={(e) => setDraft({ ...draft, shields: { ...draft.shields, max: +e.target.value } })}
                onBlur={() => update({ shields: { ...ship.shields, max: draft.shields.max } })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="lcars-label text-xs block mb-0.5">Weapons</label>
              <input
                type="number"
                className="lcars-input text-xs py-1"
                value={draft.systems.weapons}
                onChange={(e) => setDraft({ ...draft, systems: { ...draft.systems, weapons: +e.target.value } })}
                onBlur={() => update({ systems: { ...ship.systems, weapons: draft.systems.weapons } })}
              />
            </div>
            <div>
              <label className="lcars-label text-xs block mb-0.5">Sensors</label>
              <input
                type="number"
                className="lcars-input text-xs py-1"
                value={draft.systems.sensors}
                onChange={(e) => setDraft({ ...draft, systems: { ...draft.systems, sensors: +e.target.value } })}
                onBlur={() => update({ systems: { ...ship.systems, sensors: draft.systems.sensors } })}
              />
            </div>
            <div>
              <label className="lcars-label text-xs block mb-0.5">Scale</label>
              <input
                type="number"
                className="lcars-input text-xs py-1"
                value={draft.scale}
                min={1} max={6}
                onChange={(e) => setDraft({ ...draft, scale: +e.target.value })}
                onBlur={() => update({ scale: draft.scale })}
              />
            </div>
          </div>
          <div>
            <label className="lcars-label text-xs block mb-0.5">Contact label (shown to players when unrevealed)</label>
            <input
              className="lcars-input text-xs py-1"
              value={draft.contactDesignation}
              onChange={(e) => setDraft({ ...draft, contactDesignation: e.target.value })}
              onBlur={() => update({ contactDesignation: draft.contactDesignation })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function EnemyShipManager() {
  const enemyShips = useEnemyShips();

  const addEnemy = () => {
    getSocket().emit('gm-add-enemy', { ship: defaultEnemy() }, (result) => {
      if ('error' in result) console.warn(result.error);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="lcars-label">Enemy Ships ({Object.keys(enemyShips).length})</div>
        <button className="lcars-btn-amber text-xs px-3 py-1" onClick={addEnemy}>
          + Add Ship
        </button>
      </div>

      {Object.values(enemyShips).length === 0 ? (
        <div className="text-gray-600 text-xs uppercase">No enemy ships — click Add Ship</div>
      ) : (
        <div className="space-y-2">
          {Object.values(enemyShips).map((ship) => (
            <EnemyCard key={ship.id} ship={ship} />
          ))}
        </div>
      )}
    </div>
  );
}
