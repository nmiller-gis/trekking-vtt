import { StationType } from '@lcars-vtt/shared';
import { getSocket } from '../../hooks/useSocket';
import { useUIStore } from '../../store/uiStore';
import { usePlayers, useIsGM } from '../../hooks/useGameState';
import { useGameStore } from '../../store/gameStore';

const STATIONS: { id: StationType; label: string; desc: string; color: string }[] = [
  { id: 'command', label: 'Command', desc: 'Captain / XO — coordinate crew, manage momentum', color: 'bg-lcars-amber' },
  { id: 'conn', label: 'Conn', desc: 'Helm / Navigation — pilot the ship, evasive maneuvers', color: 'bg-lcars-blue' },
  { id: 'tactical', label: 'Tactical', desc: 'Weapons & shields — fire phasers, torpedoes, raise shields', color: 'bg-lcars-red' },
  { id: 'science', label: 'Science', desc: 'Sensors — scan contacts, analyze weaknesses', color: 'bg-lcars-purple' },
  { id: 'communications', label: 'Communications', desc: 'Hail, intercept signals, electronic warfare', color: 'bg-lcars-gold' },
  { id: 'engineering', label: 'Engineering', desc: 'Power management, damage control, boost systems', color: 'bg-lcars-peach' },
];

export default function StationSelector() {
  const { setView, setRightPanel, roomCode } = useUIStore();
  const players = usePlayers();
  const isGM = useIsGM();
  const myPlayerId = useGameStore((s) => s.myPlayerId);

  const occupiedStations = Object.values(players)
    .filter((p) => p.id !== myPlayerId && p.connected)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.station) acc[p.station] = p.name;
      return acc;
    }, {});

  const selectStation = (station: StationType) => {
    getSocket().emit('select-station', { station });
    setRightPanel(isGM ? 'gm' : 'character');
    setView('play');
  };

  const observeOnly = () => {
    getSocket().emit('select-station', { station: null });
    setView('play');
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="flex items-center mb-6">
          <div className="w-4 h-16 bg-lcars-amber rounded-l-full mr-1" />
          <div className="w-2 h-10 bg-lcars-blue mr-4" />
          <div>
            <div className="text-lcars-amber text-xl uppercase tracking-widest">Select Station</div>
            <div className="text-lcars-blue text-xs uppercase">Room: {roomCode}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {STATIONS.map((station) => {
            const occupant = occupiedStations[station.id];
            return (
              <button
                key={station.id}
                className={`text-left p-4 rounded border-2 border-transparent
                  ${occupant ? 'opacity-50 cursor-default' : 'cursor-pointer hover:border-lcars-amber'}
                  bg-lcars-panel transition-all`}
                onClick={() => !occupant && selectStation(station.id)}
                disabled={!!occupant}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${station.color}`} />
                  <span className="lcars-header">{station.label}</span>
                </div>
                <div className="text-xs text-gray-400">{station.desc}</div>
                {occupant && (
                  <div className="text-xs text-lcars-amber mt-1">↳ {occupant}</div>
                )}
              </button>
            );
          })}
        </div>

        {isGM && (
          <div className="lcars-panel p-3 mb-3 border-lcars-purple border">
            <div className="text-xs text-lcars-purple uppercase tracking-widest mb-1">GM Mode Active</div>
            <div className="text-xs text-gray-400">You have access to GM Controls regardless of station.</div>
          </div>
        )}

        <div className="flex gap-2">
          <button className="lcars-btn-ghost text-sm" onClick={observeOnly}>
            Observe only (no station)
          </button>
          {isGM && (
            <button className="lcars-btn-amber text-sm" onClick={() => { getSocket().emit('select-station', { station: null }); setRightPanel('gm'); setView('play'); }}>
              Enter GM controls
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
