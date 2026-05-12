import { useState } from 'react';
import { useCharacters, usePlayers, usePlayerShip, useThreat, useDirectives } from '../../hooks/useGameState';
import { getSocket } from '../../hooks/useSocket';
import SceneManager from './SceneManager';
import EnemyShipManager from './EnemyShipManager';
import ShipStatus from '../shared/ShipStatus';
import ExtendedTaskTracker from './ExtendedTaskTracker';
import { Ship, Injury } from '@lcars-vtt/shared';

type Tab = 'scene' | 'enemies' | 'ship' | 'players' | 'threat' | 'directives' | 'tasks';

const DEFAULT_SHIP: Omit<Ship, 'id'> & { id: string } = {
  id: 'player-ship',
  name: 'USS Enterprise',
  registry: 'NCC-1701-D',
  systems: { communications: 10, computers: 10, engines: 12, sensors: 10, structure: 12, weapons: 12 },
  departments: { command: 4, conn: 3, engineering: 4, medicine: 2, science: 3, security: 3 },
  scale: 6,
  power: { current: 12, max: 12 },
  shields: { current: 24, max: 24 },
  hullIntegrity: { current: 30, max: 30 },
  breaches: 0,
  crewSupport: { current: 6, max: 6 },
  traits: ['Starfleet Vessel', 'Galaxy-Class'],
  talents: ['Advanced Shields', 'Improved Warp Drive'],
  weapons: [
    { name: 'Phaser Arrays', type: 'energy', range: 'medium', damage: 9, qualities: ['accurate'] },
    { name: 'Photon Torpedoes', type: 'torpedo', range: 'long', damage: 6, qualities: ['highYield'] },
  ],
};

export default function GMControls() {
  const [activeTab, setActiveTab] = useState<Tab>('scene');
  const threat = useThreat();
  const playerShip = usePlayerShip();
  const characters = useCharacters();
  const players = usePlayers();
  const directives = useDirectives();
  const [shipDraft, setShipDraft] = useState<typeof DEFAULT_SHIP>(
    (playerShip as typeof DEFAULT_SHIP) ?? DEFAULT_SHIP
  );
  const [newDirective, setNewDirective] = useState('');

  const [injuryTarget, setInjuryTarget] = useState<string | null>(null);
  const [injuryDesc, setInjuryDesc] = useState('');
  const [injurySev, setInjurySev] = useState<Injury['severity']>('stun');

  const inflictInjury = (charId: string) => {
    if (!injuryDesc.trim()) return;
    getSocket().emit('suffer-injury', { characterId: charId, description: injuryDesc.trim(), severity: injurySev });
    setInjuryTarget(null);
    setInjuryDesc('');
    setInjurySev('stun');
  };

  const addDirective = () => {
    if (!newDirective.trim()) return;
    getSocket().emit('gm-add-directive', { text: newDirective.trim() }, (r) => {
      if ('error' in r) console.warn(r.error);
    });
    setNewDirective('');
  };

  const removeDirective = (directiveId: string) => {
    getSocket().emit('gm-remove-directive', { directiveId });
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'scene', label: 'Scene' },
    { id: 'enemies', label: 'Enemies' },
    { id: 'ship', label: 'Player Ship' },
    { id: 'players', label: 'Crew' },
    { id: 'threat', label: 'Threat' },
    { id: 'directives', label: 'Directives' },
    { id: 'tasks', label: 'Tasks' },
  ];

  const saveShip = () => {
    getSocket().emit('gm-update-ship', { ship: shipDraft });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-6 bg-lcars-purple rounded-full" />
        <div className="lcars-header text-lcars-purple">GM Controls</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            className={`lcars-btn text-xs py-1 px-3 ${activeTab === id ? 'bg-lcars-purple text-white' : 'lcars-btn-ghost border-lcars-purple text-lcars-purple'}`}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'scene' && <SceneManager />}
        {activeTab === 'enemies' && <EnemyShipManager />}

        {activeTab === 'ship' && (
          <div className="space-y-4">
            {playerShip && (
              <div className="lcars-panel p-3">
                <div className="lcars-label mb-2">Current Ship Status</div>
                <ShipStatus ship={playerShip} />
              </div>
            )}

            <div className="lcars-header">Configure Ship</div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="lcars-label text-xs block mb-0.5">Ship Name</label>
                  <input
                    className="lcars-input text-xs py-1"
                    value={shipDraft.name}
                    onChange={(e) => setShipDraft({ ...shipDraft, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="lcars-label text-xs block mb-0.5">Registry</label>
                  <input
                    className="lcars-input text-xs py-1"
                    value={shipDraft.registry}
                    onChange={(e) => setShipDraft({ ...shipDraft, registry: e.target.value })}
                  />
                </div>
              </div>

              <div className="lcars-label">Systems (06–16)</div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(shipDraft.systems) as (keyof typeof shipDraft.systems)[]).map((sys) => (
                  <div key={sys}>
                    <label className="lcars-label text-xs block mb-0.5 capitalize">{sys}</label>
                    <input
                      type="number"
                      className="lcars-input text-xs py-1"
                      value={shipDraft.systems[sys]}
                      min={6} max={16}
                      onChange={(e) => setShipDraft({ ...shipDraft, systems: { ...shipDraft.systems, [sys]: +e.target.value } })}
                    />
                  </div>
                ))}
              </div>

              <div className="lcars-label">Departments (1–5)</div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(shipDraft.departments) as (keyof typeof shipDraft.departments)[]).map((dept) => (
                  <div key={dept}>
                    <label className="lcars-label text-xs block mb-0.5 capitalize">{dept}</label>
                    <input
                      type="number"
                      className="lcars-input text-xs py-1"
                      value={shipDraft.departments[dept]}
                      min={1} max={5}
                      onChange={(e) => setShipDraft({ ...shipDraft, departments: { ...shipDraft.departments, [dept]: +e.target.value } })}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="lcars-label text-xs block mb-0.5">Scale</label>
                  <input type="number" className="lcars-input text-xs py-1" value={shipDraft.scale} min={1} max={6}
                    onChange={(e) => setShipDraft({ ...shipDraft, scale: +e.target.value })} />
                </div>
                <div>
                  <label className="lcars-label text-xs block mb-0.5">Hull Max</label>
                  <input type="number" className="lcars-input text-xs py-1" value={shipDraft.hullIntegrity.max}
                    onChange={(e) => setShipDraft({ ...shipDraft, hullIntegrity: { ...shipDraft.hullIntegrity, max: +e.target.value, current: +e.target.value } })} />
                </div>
                <div>
                  <label className="lcars-label text-xs block mb-0.5">Shields Max</label>
                  <input type="number" className="lcars-input text-xs py-1" value={shipDraft.shields.max}
                    onChange={(e) => setShipDraft({ ...shipDraft, shields: { ...shipDraft.shields, max: +e.target.value, current: +e.target.value } })} />
                </div>
              </div>

              <button className="lcars-btn-amber w-full text-sm" onClick={saveShip}>
                Save Ship Configuration
              </button>
            </div>
          </div>
        )}

        {activeTab === 'players' && (
          <div className="space-y-3">
            <div className="lcars-label">Crew Members ({Object.keys(players).length})</div>
            {Object.values(players).map((player) => {
              const char = player.characterId ? characters[player.characterId] : null;
              return (
                <div key={player.id} className="lcars-panel p-3">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-white font-bold">{player.name}</span>
                    <div className="flex gap-2 text-xs">
                      {player.isGM && <span className="text-lcars-purple">GM</span>}
                      <span className={player.connected ? 'text-green-500' : 'text-gray-600'}>
                        {player.connected ? '● Online' : '○ Offline'}
                      </span>
                    </div>
                  </div>
                  {player.station && <div className="text-xs text-lcars-amber uppercase">{player.station}</div>}
                  {char && (
                    <div className="text-xs text-gray-400 mt-1">
                      {char.name} · {char.rank} · Stress {char.stress.current}/{char.stress.max} · Det {char.determination}
                    </div>
                  )}
                  {char && (
                    <div className="space-y-1 mt-1">
                      <div className="flex gap-1">
                        <button
                          className="lcars-btn text-xs px-2 py-0.5 bg-lcars-gold text-black"
                          onClick={() => getSocket().emit('gm-award-determination', { characterId: char.id, reason: 'GM award' })}
                        >
                          +Determination
                        </button>
                        <button
                          className="lcars-btn text-xs px-2 py-0.5 border border-lcars-red text-lcars-red hover:bg-lcars-red hover:text-white"
                          onClick={() => setInjuryTarget(injuryTarget === char.id ? null : char.id)}
                        >
                          Inflict Injury
                        </button>
                      </div>
                      {injuryTarget === char.id && (
                        <div className="flex gap-1 items-center mt-1">
                          <input
                            className="lcars-input text-xs py-0.5 flex-1"
                            placeholder="Injury description…"
                            value={injuryDesc}
                            onChange={(e) => setInjuryDesc(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && inflictInjury(char.id)}
                            autoFocus
                          />
                          <button
                            className={`lcars-btn text-xs px-2 py-0.5 border ${injurySev === 'stun' ? 'bg-lcars-amber text-black' : 'border-lcars-amber text-lcars-amber'}`}
                            onClick={() => setInjurySev('stun')}
                          >Stun</button>
                          <button
                            className={`lcars-btn text-xs px-2 py-0.5 border ${injurySev === 'deadly' ? 'bg-lcars-red text-white' : 'border-lcars-red text-lcars-red'}`}
                            onClick={() => setInjurySev('deadly')}
                          >Deadly</button>
                          <button className="lcars-btn-red text-xs px-2" onClick={() => inflictInjury(char.id)}>Add</button>
                          <button className="lcars-btn-ghost text-xs px-1" onClick={() => setInjuryTarget(null)}>✕</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'threat' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-6xl font-bold text-lcars-red">{threat}</div>
              <div className="lcars-label mt-1">Threat Pool</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 5, 10].map((amount) => (
                <button
                  key={amount}
                  className="lcars-btn-red text-sm py-2"
                  onClick={() => getSocket().emit('gm-spend-threat', { amount, reason: `GM spent ${amount} threat` }, () => {})}
                >
                  −{amount}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-500 uppercase">Click to spend · Players can add threat via actions</div>

            <div className="lcars-panel p-3 border-lcars-red border text-xs text-gray-400">
              <div className="lcars-label mb-1">Common Threat Spends</div>
              <ul className="space-y-1">
                <li>• Add dice to NPC task roll (2 per die)</li>
                <li>• Trigger NPC talent (2 threat)</li>
                <li>• Introduce complication (2 threat)</li>
                <li>• Reinforce enemy ship shields (varies)</li>
                <li>• Activate environmental hazard</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'directives' && (
          <div className="space-y-3">
            <div className="lcars-label">Mission Directives ({directives.length}/3)</div>
            <div className="text-xs text-gray-500">
              Directives are mission-wide values. Players can invoke (spend 1 Determination) or challenge (gain 1 Determination) them.
            </div>

            {directives.length < 3 && (
              <div className="flex gap-2">
                <input
                  className="lcars-input text-xs py-1 flex-1"
                  placeholder="Directive text…"
                  value={newDirective}
                  onChange={(e) => setNewDirective(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addDirective()}
                />
                <button className="lcars-btn-amber text-xs px-3" onClick={addDirective}>Add</button>
              </div>
            )}

            {directives.length === 0 && (
              <div className="text-xs text-gray-600 uppercase">No directives set</div>
            )}

            {directives.map((d) => (
              <div key={d.id} className="lcars-panel p-3 border border-lcars-blue flex justify-between items-start gap-2">
                <div>
                  <div className="text-sm text-lcars-blue">"{d.text}"</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Invoked by {d.invokedBy.length} · Challenged by {d.challengedBy.length}
                  </div>
                </div>
                <button
                  className="text-xs text-gray-600 hover:text-lcars-red shrink-0"
                  onClick={() => removeDirective(d.id)}
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tasks' && <ExtendedTaskTracker />}
      </div>
    </div>
  );
}
