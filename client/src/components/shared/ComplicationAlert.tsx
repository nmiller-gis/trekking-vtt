import { useGameStore } from '../../store/gameStore';
import { getSocket } from '../../hooks/useSocket';

export default function ComplicationAlerts() {
  const { pendingComplications, resolveComplication } = useGameStore();

  if (pendingComplications.length === 0) return null;

  const buyOff = (rollId: string, count: number) => {
    getSocket().emit('buy-off-complication', { rollId, count });
    resolveComplication(rollId);
  };

  const dismiss = (rollId: string) => {
    getSocket().emit('dismiss-complication', { rollId });
    resolveComplication(rollId);
  };

  return (
    <div className="shrink-0 border-b border-lcars-red bg-lcars-red/10">
      {pendingComplications.map((c) => (
        <div key={c.rollId} className="flex items-center gap-3 px-4 py-2">
          <span className="text-lcars-red text-xs uppercase font-bold">⚠ Complication</span>
          <span className="text-gray-300 text-xs flex-1">
            {c.count > 1 ? `${c.count} complications on ` : 'Complication on '}
            <span className="text-white font-bold">{c.playerName}</span>'s roll
          </span>
          <button
            className="lcars-btn text-xs px-3 py-1 bg-lcars-panel border border-lcars-amber text-lcars-amber hover:bg-lcars-amber hover:text-black"
            onClick={() => buyOff(c.rollId, c.count)}
            title={`Add ${c.count * 2} Threat to buy off this complication`}
          >
            Buy Off (+{c.count * 2} Threat)
          </button>
          <button
            className="lcars-btn-ghost text-xs px-3 py-1"
            onClick={() => dismiss(c.rollId)}
            title="Accept the complication — GM will introduce it"
          >
            Accept
          </button>
        </div>
      ))}
    </div>
  );
}
