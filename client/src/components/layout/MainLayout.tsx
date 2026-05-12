import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMyPlayer, useMyCharacter, usePlayerShip, useIsGM, useScene, useDirectives, useSceneTraits } from '../../hooks/useGameState';
import { useGameStore } from '../../store/gameStore';
import { getSocket } from '../../hooks/useSocket';

import MomentumTracker from '../shared/MomentumTracker';
import ThreatTracker from '../shared/ThreatTracker';
import RollLog from '../shared/RollLog';
import DiceRoller from '../shared/DiceRoller';
import ComplicationAlerts from '../shared/ComplicationAlert';
import InitiativeTracker from '../shared/InitiativeTracker';
import ShipStatus from '../shared/ShipStatus';
import CharacterSheet from '../character/CharacterSheet';
import CharacterCreator from '../character/CharacterCreator';
import GMControls from '../gm/GMControls';

import CommandStation from '../stations/CommandStation';
import ConnStation from '../stations/ConnStation';
import TacticalStation from '../stations/TacticalStation';
import ScienceStation from '../stations/ScienceStation';
import CommunicationsStation from '../stations/CommunicationsStation';
import EngineeringStation from '../stations/EngineeringStation';

const STATION_COMPONENTS = {
  command: CommandStation,
  conn: ConnStation,
  tactical: TacticalStation,
  science: ScienceStation,
  communications: CommunicationsStation,
  engineering: EngineeringStation,
};

const STATION_COLORS: Record<string, string> = {
  command: 'text-lcars-amber',
  conn: 'text-lcars-blue',
  tactical: 'text-lcars-red',
  science: 'text-lcars-purple',
  communications: 'text-lcars-gold',
  engineering: 'text-lcars-peach',
};

export default function MainLayout() {
  const { rightPanel, setRightPanel, diceRollerOpen, setDiceRollerOpen, roomCode, setView } = useUIStore();
  const myPlayer = useMyPlayer();
  const myCharacter = useMyCharacter();
  const playerShip = usePlayerShip();
  const isGM = useIsGM();
  const scene = useScene();
  const directives = useDirectives();
  const sceneTraits = useSceneTraits();
  const [creatingCharacter, setCreatingCharacter] = useState(!myCharacter);
  const [directivesOpen, setDirectivesOpen] = useState(false);

  const station = myPlayer?.station ?? null;
  const StationComponent = station ? STATION_COMPONENTS[station] : null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-lcars-border bg-lcars-panel shrink-0">
        {/* LCARS accent */}
        <div className="flex items-center gap-1 mr-2">
          <div className="w-3 h-8 bg-lcars-amber rounded-full" />
          <div className="w-1 h-6 bg-lcars-blue" />
        </div>

        <div className="text-lcars-amber text-sm font-bold uppercase tracking-widest">LCARS VTT</div>

        {roomCode && (
          <div className="text-xs">
            <span className="text-gray-500">Room: </span>
            <span className="text-lcars-gold font-bold">{roomCode}</span>
          </div>
        )}

        {scene && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-xs">
              <span className="text-gray-500">Scene: </span>
              <span className="text-white">{scene.name}</span>
              {scene.type === 'ship-combat' && (
                <span className="text-lcars-red ml-2">Round {scene.roundNumber}</span>
              )}
            </div>
            {sceneTraits.map((trait, i) => (
              <span key={i} className="text-xs px-1.5 py-0.5 bg-lcars-panel border border-lcars-blue text-lcars-blue rounded">{trait}</span>
            ))}
            <InitiativeTracker />
          </div>
        )}

        {station && (
          <div className="text-xs">
            <span className="text-gray-500">Station: </span>
            <span className={`uppercase font-bold ${STATION_COLORS[station] ?? 'text-white'}`}>{station}</span>
          </div>
        )}

        <div className="flex-1" />

        <MomentumTracker />

        <div className="w-px h-8 bg-lcars-border mx-1" />

        <ThreatTracker />

        <div className="w-px h-8 bg-lcars-border mx-1" />

        {/* Right panel tabs */}
        <div className="flex gap-1">
          <button
            className={`lcars-btn text-xs py-1 px-2 ${rightPanel === 'character' ? 'bg-lcars-amber text-black' : 'lcars-btn-ghost'}`}
            onClick={() => setRightPanel('character')}
          >
            Char
          </button>
          <button
            className={`lcars-btn text-xs py-1 px-2 ${rightPanel === 'ship' ? 'bg-lcars-blue text-black' : 'lcars-btn-ghost'}`}
            onClick={() => setRightPanel('ship')}
          >
            Ship
          </button>
          {directives.length > 0 && (
            <button
              className={`lcars-btn text-xs py-1 px-2 ${directivesOpen ? 'bg-lcars-blue text-black' : 'lcars-btn-ghost border-lcars-blue text-lcars-blue'}`}
              onClick={() => setDirectivesOpen(!directivesOpen)}
            >
              Dir
            </button>
          )}
          {isGM && (
            <button
              className={`lcars-btn text-xs py-1 px-2 ${rightPanel === 'gm' ? 'bg-lcars-purple text-white' : 'lcars-btn-ghost border-lcars-purple text-lcars-purple'}`}
              onClick={() => setRightPanel('gm')}
            >
              GM
            </button>
          )}
        </div>

        <button
          className="lcars-btn-ghost text-xs px-2 py-1"
          onClick={() => setView('station-select')}
        >
          ⇄ Station
        </button>
        <button
          className="lcars-btn-ghost text-xs px-2 py-1"
          onClick={() => setView('dashboard')}
        >
          ⌂ Rooms
        </button>
      </div>

      {/* Directives panel */}
      {directivesOpen && directives.length > 0 && (
        <div className="shrink-0 flex gap-2 flex-wrap px-4 py-2 border-b border-lcars-border bg-lcars-panel">
          {directives.map((d) => {
            const invoked = myCharacter ? d.invokedBy.includes(myCharacter.id) : false;
            const challenged = myCharacter ? d.challengedBy.includes(myCharacter.id) : false;
            return (
              <div key={d.id} className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs ${invoked ? 'border-lcars-blue bg-lcars-panel' : 'border-gray-700'}`}>
                <span className={invoked ? 'text-lcars-blue line-through opacity-60' : 'text-gray-300'}>"{d.text}"</span>
                {myCharacter && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      className={`px-1.5 py-0.5 rounded text-xs ${invoked ? 'bg-lcars-blue text-black' : 'border border-gray-600 text-gray-500 hover:border-lcars-blue'}`}
                      disabled={invoked}
                      onClick={() => getSocket().emit('invoke-directive', { directiveId: d.id, characterId: myCharacter.id }, (r) => { if ('error' in r) console.warn(r.error); })}
                    >Invoke</button>
                    <button
                      className={`px-1.5 py-0.5 rounded text-xs ${challenged ? 'bg-lcars-red text-white' : 'border border-gray-600 text-gray-500 hover:border-lcars-red'}`}
                      disabled={challenged}
                      onClick={() => getSocket().emit('challenge-directive', { directiveId: d.id, characterId: myCharacter.id }, (r) => { if ('error' in r) console.warn(r.error); })}
                    >Challenge</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Station panel */}
        <div className="w-[55%] border-r border-lcars-border overflow-y-auto">
          {StationComponent ? (
            <StationComponent />
          ) : (
            <div className="p-6 text-center">
              <div className="text-gray-600 text-sm uppercase mb-2">No station selected</div>
              <button className="lcars-btn-ghost text-sm" onClick={() => setView('station-select')}>
                Select a Station
              </button>
            </div>
          )}
        </div>

        {/* Right: Character / Ship / GM */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {rightPanel === 'character' && (
              creatingCharacter || !myCharacter ? (
                <div className="h-full flex flex-col">
                  <div className="lcars-header mb-4">Create Your Character</div>
                  <div className="flex-1">
                    <CharacterCreator onCancel={() => setCreatingCharacter(false)} />
                  </div>
                </div>
              ) : (
                <CharacterSheet
                  character={myCharacter}
                  editable
                  onCreateNew={() => setCreatingCharacter(true)}
                />
              )
            )}

            {rightPanel === 'ship' && (
              playerShip ? (
                <ShipStatus ship={playerShip} />
              ) : (
                <div className="text-gray-600 text-sm uppercase text-center py-8">
                  No ship configured — GM must set up the ship
                </div>
              )
            )}

            {rightPanel === 'gm' && isGM && <GMControls />}
          </div>
        </div>
      </div>

      {/* Complication alerts */}
      <ComplicationAlerts />

      {/* Bottom: Roll log + Dice roller */}
      <div className="h-52 flex border-t border-lcars-border shrink-0">
        {/* Roll log */}
        <div className="flex-1 p-3 overflow-hidden border-r border-lcars-border">
          <RollLog />
        </div>

        {/* Dice roller */}
        <div className="w-80 flex flex-col">
          <div
            className="flex items-center justify-between px-3 py-1.5 bg-lcars-panel border-b border-lcars-border cursor-pointer"
            onClick={() => setDiceRollerOpen(!diceRollerOpen)}
          >
            <span className="lcars-label text-xs">Dice Roller</span>
            <span className="text-lcars-amber text-xs">{diceRollerOpen ? '▼' : '▲'}</span>
          </div>
          {diceRollerOpen && (
            <div className="flex-1 p-3 overflow-y-auto">
              <DiceRoller />
            </div>
          )}
          {!diceRollerOpen && (
            <div className="flex-1 flex items-center justify-center">
              <button
                className="lcars-btn-amber text-sm"
                onClick={() => setDiceRollerOpen(true)}
              >
                Open Dice Roller
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
