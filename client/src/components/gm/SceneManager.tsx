import { useState } from 'react';
import { SceneType } from '@lcars-vtt/shared';
import { useScene } from '../../hooks/useGameState';
import { getSocket } from '../../hooks/useSocket';

type InitiativeSide = 'players' | 'gm';

const SCENE_TYPES: { type: SceneType; label: string; color: string }[] = [
  { type: 'social', label: 'Social', color: 'bg-lcars-blue' },
  { type: 'action', label: 'Action', color: 'bg-lcars-amber' },
  { type: 'ship-combat', label: 'Ship Combat', color: 'bg-lcars-red' },
  { type: 'hazard', label: 'Hazard', color: 'bg-lcars-purple' },
];

export default function SceneManager() {
  const scene = useScene();
  const [name, setName] = useState(scene?.name ?? '');
  const [description, setDescription] = useState(scene?.description ?? '');
  const [firstSide, setFirstSide] = useState<InitiativeSide>('players');

  const update = (updates: Partial<NonNullable<typeof scene>>) => {
    getSocket().emit('gm-change-scene', { scene: updates });
  };

  const endScene = () => {
    getSocket().emit('gm-end-scene', { nextScene: { name: 'New Scene', description: '', roundNumber: 1 } });
    setName('New Scene');
    setDescription('');
  };

  const advanceRound = () => {
    getSocket().emit('gm-advance-round');
  };

  const startInitiative = () => {
    getSocket().emit('gm-start-initiative', { firstSide }, (r) => {
      if ('error' in r) console.warn(r.error);
    });
  };

  const endInitiative = () => {
    getSocket().emit('gm-end-initiative', {}, (r) => {
      if ('error' in r) console.warn(r.error);
    });
  };

  const removeSceneTrait = (index: number) => {
    getSocket().emit('remove-scene-trait', { index }, (r) => {
      if ('error' in r) console.warn(r.error);
    });
  };

  if (!scene) return null;

  return (
    <div className="space-y-4">
      <div className="lcars-label">Scene Type</div>
      <div className="grid grid-cols-2 gap-2">
        {SCENE_TYPES.map(({ type, label, color }) => (
          <button
            key={type}
            className={`lcars-btn py-2 text-sm ${scene.type === type ? `${color} text-black font-bold` : 'lcars-btn-ghost'}`}
            onClick={() => update({ type })}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <label className="lcars-label block mb-1">Scene Name</label>
        <div className="flex gap-2">
          <input
            className="lcars-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => update({ name })}
            placeholder="Bridge of the Enterprise…"
          />
        </div>
      </div>

      <div>
        <label className="lcars-label block mb-1">Description</label>
        <textarea
          className="lcars-input resize-none h-16 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => update({ description })}
          placeholder="What the players see and know…"
        />
      </div>

      {scene.type === 'ship-combat' && (
        <div className="lcars-panel p-3 border-lcars-red border">
          <div className="flex justify-between items-center">
            <div>
              <div className="lcars-label">Round</div>
              <div className="text-lcars-red text-2xl font-bold">{scene.roundNumber}</div>
            </div>
            <button className="lcars-btn-red text-sm px-4" onClick={advanceRound}>
              Advance Round →
            </button>
          </div>
        </div>
      )}

      {/* Scene Traits */}
      {(scene.traits?.length > 0) && (
        <div>
          <div className="lcars-label mb-1">Scene Traits</div>
          <div className="flex flex-wrap gap-1">
            {scene.traits.map((trait, i) => (
              <span key={i} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-lcars-panel border border-lcars-blue text-lcars-blue rounded">
                {trait}
                <button className="text-gray-500 hover:text-lcars-red ml-1" onClick={() => removeSceneTrait(i)}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Initiative */}
      <div className="lcars-panel p-3 border-lcars-amber border">
        {scene.initiative?.active ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="lcars-label">Initiative Active</div>
              <button className="lcars-btn-ghost text-xs px-2" onClick={endInitiative}>End</button>
            </div>
            <div className="text-xs text-gray-400">
              Current side: <span className="text-lcars-amber font-bold uppercase">{scene.initiative.currentSide}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="lcars-label">Start Initiative</div>
            <div className="flex gap-2">
              {(['players', 'gm'] as InitiativeSide[]).map((side) => (
                <button
                  key={side}
                  className={`flex-1 text-xs py-1 rounded border ${firstSide === side ? 'bg-lcars-amber text-black border-lcars-amber' : 'border-gray-600 text-gray-400 hover:border-lcars-amber'}`}
                  onClick={() => setFirstSide(side)}
                >
                  {side === 'players' ? 'Players First' : 'GM First'}
                </button>
              ))}
            </div>
            <button
              className="lcars-btn w-full text-xs bg-lcars-panel border border-lcars-amber text-lcars-amber hover:bg-lcars-amber hover:text-black"
              onClick={startInitiative}
            >
              Begin Initiative
            </button>
          </div>
        )}
      </div>

      <div className="lcars-panel p-3 border-gray-700 border">
        <button
          className="lcars-btn w-full text-sm bg-lcars-panel border border-lcars-amber text-lcars-amber hover:bg-lcars-amber hover:text-black"
          onClick={endScene}
        >
          End Scene (−1 Momentum)
        </button>
        <div className="text-xs text-gray-600 mt-1 text-center">Decays momentum and resets scene</div>
      </div>
    </div>
  );
}
