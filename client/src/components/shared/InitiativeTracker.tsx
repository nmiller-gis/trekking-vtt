import { useInitiative, usePlayers, useCharacters, useMyCharacter, useIsGM } from '../../hooks/useGameState';
import { getSocket } from '../../hooks/useSocket';

export default function InitiativeTracker() {
  const initiative = useInitiative();
  const players = usePlayers();
  const characters = useCharacters();
  const myCharacter = useMyCharacter();
  const isGM = useIsGM();

  if (!initiative?.active) return null;

  const pass = () => {
    getSocket().emit('pass-initiative', {}, (r) => {
      if ('error' in r) console.warn(r.error);
    });
  };

  const endInitiative = () => {
    getSocket().emit('gm-end-initiative', {}, (r) => {
      if ('error' in r) console.warn(r.error);
    });
  };

  const toggleActed = (charId: string) => {
    getSocket().emit('mark-acted', { characterId: charId }, (r) => {
      if ('error' in r) console.warn(r.error);
    });
  };

  const playerChars = Object.values(players)
    .filter((p) => !p.isGM && p.characterId)
    .map((p) => characters[p.characterId!])
    .filter(Boolean);

  const isPlayerSide = initiative.currentSide === 'players';

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-lcars-panel border border-lcars-amber rounded text-xs">
      <span className="text-gray-500 uppercase text-xs tracking-wider">Initiative:</span>

      <button
        className={`px-2 py-0.5 rounded font-bold uppercase transition-all ${isPlayerSide ? 'bg-lcars-amber text-black' : 'border border-gray-600 text-gray-500'}`}
      >
        Players
      </button>
      <button
        className={`px-2 py-0.5 rounded font-bold uppercase transition-all ${!isPlayerSide ? 'bg-lcars-red text-white' : 'border border-gray-600 text-gray-500'}`}
      >
        GM
      </button>

      {/* Character acted dots */}
      {playerChars.length > 0 && (
        <div className="flex gap-1 items-center ml-1">
          {playerChars.map((char) => {
            const hasActed = initiative.actedThisRound.includes(char.id);
            const isMe = char.id === myCharacter?.id;
            return (
              <button
                key={char.id}
                title={`${char.name}${hasActed ? ' (acted)' : ''}`}
                className={`w-4 h-4 rounded-full border transition-all ${hasActed ? 'bg-lcars-amber border-lcars-amber' : 'bg-transparent border-gray-600 hover:border-lcars-amber'} ${isMe ? 'ring-1 ring-lcars-blue' : ''}`}
                onClick={() => (isMe || isGM) ? toggleActed(char.id) : undefined}
              />
            );
          })}
        </div>
      )}

      <button
        className="lcars-btn-ghost text-xs px-2 py-0.5 ml-1"
        onClick={pass}
        title="Pass initiative to the other side"
      >
        Pass →
      </button>

      {isGM && (
        <button
          className="text-xs text-gray-600 hover:text-lcars-red px-1"
          onClick={endInitiative}
          title="End initiative tracking"
        >
          ✕
        </button>
      )}
    </div>
  );
}
