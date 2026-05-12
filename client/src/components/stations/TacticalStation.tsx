import { useState } from 'react';
import { ShipWeapon } from '@lcars-vtt/shared';
import { useMyCharacter, usePlayerShip } from '../../hooks/useGameState';
import { useRoller } from '../../hooks/useRoller';

export default function TacticalStation() {
  const character = useMyCharacter();
  const ship = usePlayerShip();
  const { rollTask, rollChallenge } = useRoller();
  const [selectedWeapon, setSelectedWeapon] = useState<ShipWeapon | null>(null);

  const fireWeapon = (weapon: ShipWeapon) => {
    if (!ship || !character) return;
    const target = ship.systems.weapons + ship.departments.security;
    rollTask({
      numDice: 2,
      targetNumber: target,
      difficulty: 2,
      isFocusApplied: false,
      label: `Fire ${weapon.name}`,
      attributeUsed: 'weapons',
      disciplineUsed: 'security',
    });
  };

  const rollDamage = (weapon: ShipWeapon) => {
    rollChallenge(weapon.damage, `${weapon.name} damage`);
  };

  const rollRaiseShields = () => {
    if (!ship) return;
    rollTask({
      numDice: 2,
      targetNumber: ship.systems.structure + ship.departments.security,
      difficulty: 1,
      isFocusApplied: false,
      label: 'Raise Shields',
      attributeUsed: 'structure',
      disciplineUsed: 'security',
    });
  };

  const rollTargetSystem = () => {
    if (!ship) return;
    rollTask({
      numDice: 2,
      targetNumber: ship.systems.weapons + ship.departments.security,
      difficulty: 3,
      isFocusApplied: false,
      label: 'Target System (precision strike)',
      attributeUsed: 'weapons',
      disciplineUsed: 'security',
    });
  };

  return (
    <div className="station-panel space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-8 bg-lcars-red rounded-full" />
        <div>
          <div className="lcars-header">Tactical Station</div>
          {character && <div className="text-xs text-gray-400">{character.name}</div>}
        </div>
      </div>

      {/* Shield and weapon status */}
      {ship && (
        <div className="lcars-panel p-3">
          <div className="grid grid-cols-2 gap-3 text-center text-xs">
            <div>
              <div className={`text-2xl font-bold ${ship.shields.current < ship.shields.max * 0.3 ? 'text-lcars-red lcars-blink' : 'text-lcars-blue'}`}>
                {ship.shields.current}/{ship.shields.max}
              </div>
              <div className="text-gray-500 uppercase">Shields</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${ship.hullIntegrity.current < ship.hullIntegrity.max * 0.4 ? 'text-lcars-red' : 'text-lcars-gold'}`}>
                {ship.hullIntegrity.current}/{ship.hullIntegrity.max}
              </div>
              <div className="text-gray-500 uppercase">Hull</div>
            </div>
          </div>
          {ship.breaches > 0 && (
            <div className="text-lcars-red text-xs text-center mt-2 lcars-blink">
              ⚠ {ship.breaches} system breach{ship.breaches !== 1 ? 'es' : ''}
            </div>
          )}
        </div>
      )}

      {/* Weapons */}
      {ship && ship.weapons.length > 0 && (
        <div>
          <div className="lcars-header mb-2">Weapons</div>
          <div className="space-y-2">
            {ship.weapons.map((weapon, i) => (
              <div
                key={i}
                className={`p-3 rounded border cursor-pointer transition-all
                  ${selectedWeapon === weapon ? 'border-lcars-amber bg-lcars-panel' : 'border-gray-700 hover:border-gray-500'}`}
                onClick={() => setSelectedWeapon(selectedWeapon === weapon ? null : weapon)}
              >
                <div className="flex justify-between items-baseline">
                  <span className="text-white font-bold text-sm">{weapon.name}</span>
                  <span className="text-lcars-amber text-xs">{weapon.damage}[CD]</span>
                </div>
                <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                  <span className="capitalize">{weapon.type}</span>
                  <span>·</span>
                  <span className="capitalize">{weapon.range}</span>
                  {weapon.qualities.length > 0 && (
                    <>
                      <span>·</span>
                      <span>{weapon.qualities.join(', ')}</span>
                    </>
                  )}
                </div>

                {selectedWeapon === weapon && (
                  <div className="flex gap-2 mt-2">
                    <button
                      className="lcars-btn-amber text-xs px-2 py-1"
                      onClick={(e) => { e.stopPropagation(); fireWeapon(weapon); }}
                    >
                      Attack Roll
                    </button>
                    <button
                      className="lcars-btn text-xs px-2 py-1 bg-lcars-purple text-white"
                      onClick={(e) => { e.stopPropagation(); rollDamage(weapon); }}
                    >
                      Damage Dice ({weapon.damage}[CD])
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!ship || ship.weapons.length === 0 ? (
        <div className="text-gray-600 text-xs uppercase">No weapons configured — GM must set up the ship</div>
      ) : null}

      {/* Tactical actions */}
      <div>
        <div className="lcars-header mb-2">Actions</div>
        <div className="space-y-2">
          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-blue text-black"
            onClick={rollRaiseShields}
            disabled={!ship}
          >
            <div className="font-bold">Raise Shields</div>
            <div className="text-xs opacity-70">Structure + Security — restore shields</div>
          </button>
          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-panel border border-lcars-amber text-lcars-amber hover:bg-lcars-amber hover:text-black"
            onClick={rollTargetSystem}
            disabled={!ship}
          >
            <div className="font-bold">Target System</div>
            <div className="text-xs opacity-70">Weapons + Security D3 — precision strike on specific system</div>
          </button>
        </div>
      </div>
    </div>
  );
}
