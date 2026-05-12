import { useMyCharacter, usePlayers, usePlayerShip, useMomentum, useScene } from '../../hooks/useGameState';
import { getSocket } from '../../hooks/useSocket';
import { useRoller } from '../../hooks/useRoller';

export default function CommandStation() {
  const character = useMyCharacter();
  const players = usePlayers();
  const ship = usePlayerShip();
  const momentum = useMomentum();
  const scene = useScene();
  const { rollTask } = useRoller();

  const connectedPlayers = Object.values(players).filter((p) => p.connected);

  const rollDirect = () => {
    if (!character) return;
    rollTask({
      numDice: 2,
      targetNumber: character.attributes.presence + character.disciplines.command,
      difficulty: 1,
      isFocusApplied: false,
      label: 'Direct (boost ally action)',
      attributeUsed: 'presence',
      disciplineUsed: 'command',
    });
  };

  const rollCoordinate = () => {
    if (!character) return;
    rollTask({
      numDice: 2,
      targetNumber: character.attributes.presence + character.disciplines.command,
      difficulty: 2,
      isFocusApplied: false,
      label: 'Coordinate crew action',
      attributeUsed: 'presence',
      disciplineUsed: 'command',
    });
  };

  const rollLayInCourse = () => {
    if (!ship) return;
    rollTask({
      numDice: 2,
      targetNumber: ship.systems.computers + ship.departments.command,
      difficulty: 1,
      isFocusApplied: false,
      label: 'Lay In A Course',
      attributeUsed: 'computers',
      disciplineUsed: 'command',
    });
  };

  const addMomentum = (amount: number) => {
    getSocket().emit('add-momentum', { amount, source: 'Command: Direct action result' });
  };

  return (
    <div className="station-panel space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-8 bg-lcars-amber rounded-full" />
        <div>
          <div className="lcars-header">Command Station</div>
          {character && <div className="text-xs text-gray-400">{character.name} · {character.rank}</div>}
        </div>
      </div>

      {/* Scene overview */}
      {scene && (
        <div className="lcars-panel p-3 border-l-4 border-lcars-amber">
          <div className="lcars-label">Current Scene</div>
          <div className="text-white font-bold">{scene.name}</div>
          <div className="flex gap-3 text-xs text-gray-400 mt-1">
            <span className="uppercase">{scene.type}</span>
            {scene.type === 'ship-combat' && <span>Round {scene.roundNumber}</span>}
          </div>
          {scene.description && <div className="text-xs text-gray-300 mt-1">{scene.description}</div>}
        </div>
      )}

      {/* Bridge crew roster */}
      <div>
        <div className="lcars-label mb-2">Bridge Crew ({connectedPlayers.length})</div>
        <div className="grid grid-cols-2 gap-1">
          {connectedPlayers.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs p-1.5 bg-lcars-panel rounded">
              <div className={`w-2 h-2 rounded-full ${p.connected ? 'bg-green-500' : 'bg-gray-600'}`} />
              <div>
                <div className="text-white">{p.name}</div>
                {p.station && <div className="text-gray-500 uppercase">{p.station}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ship combat overview */}
      {ship && (
        <div className="lcars-panel p-3">
          <div className="lcars-label mb-2">Ship Status — {ship.name}</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className={`text-lg font-bold ${ship.shields.current < ship.shields.max * 0.3 ? 'text-lcars-red' : 'text-lcars-blue'}`}>
                {ship.shields.current}
              </div>
              <div className="text-gray-500">Shields</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${ship.hullIntegrity.current < ship.hullIntegrity.max * 0.3 ? 'text-lcars-red lcars-blink' : 'text-lcars-gold'}`}>
                {ship.hullIntegrity.current}
              </div>
              <div className="text-gray-500">Hull</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-lcars-gold">{ship.power.current}</div>
              <div className="text-gray-500">Power</div>
            </div>
          </div>
          {ship.breaches > 0 && (
            <div className="text-lcars-red text-xs mt-2 lcars-blink">⚠ {ship.breaches} BREACH{ship.breaches !== 1 ? 'ES' : ''}</div>
          )}
        </div>
      )}

      {/* Momentum panel */}
      <div className="lcars-panel p-3">
        <div className="lcars-label mb-2">Momentum Pool — {momentum}/6</div>
        <div className="flex gap-2 text-xs">
          <button className="lcars-btn-ghost px-2 py-1" onClick={() => addMomentum(1)}>+1 Momentum</button>
          <span className="text-gray-600 text-xs self-center">From Direct action results</span>
        </div>
      </div>

      {/* Actions */}
      <div>
        <div className="lcars-header mb-2">Command Actions</div>
        <div className="space-y-2">
          <button
            className="w-full lcars-btn-amber text-left px-3 py-2"
            onClick={rollDirect}
            disabled={!character}
          >
            <div className="font-bold">Direct</div>
            <div className="text-xs opacity-70">Presence + Command — boost a crewmember's next action</div>
          </button>

          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-panel border border-lcars-amber text-lcars-amber hover:bg-lcars-amber hover:text-black"
            onClick={rollCoordinate}
            disabled={!character}
          >
            <div className="font-bold">Coordinate</div>
            <div className="text-xs opacity-70">Presence + Command D2 — all crew benefit on next action</div>
          </button>

          <button
            className="w-full lcars-btn text-left px-3 py-2 bg-lcars-panel border border-lcars-blue text-lcars-blue hover:bg-lcars-blue hover:text-black"
            onClick={rollLayInCourse}
            disabled={!ship}
          >
            <div className="font-bold">Lay In A Course</div>
            <div className="text-xs opacity-70">Ship Computers + Command — plan a maneuver</div>
          </button>
        </div>
      </div>
    </div>
  );
}
