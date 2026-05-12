import { useGameStore } from '../store/gameStore';

export const useGameState = () => useGameStore((s) => s.gameState);
export const useMomentum = () => useGameStore((s) => s.gameState?.momentum ?? 0);
export const useThreat = () => useGameStore((s) => s.gameState?.threat ?? 0);
export const useScene = () => useGameStore((s) => s.gameState?.scene);
export const usePlayers = () => useGameStore((s) => s.gameState?.players ?? {});
export const usePlayerShip = () => useGameStore((s) => s.gameState?.playerShip ?? null);
export const useEnemyShips = () => useGameStore((s) => s.gameState?.enemyShips ?? {});
export const useRollLog = () => useGameStore((s) => s.gameState?.rollLog ?? []);
export const useCharacters = () => useGameStore((s) => s.gameState?.characters ?? {});
export const useIsGM = () => useGameStore((s) => s.isGM);
export const useMyPlayerId = () => useGameStore((s) => s.myPlayerId);
export const useMyCharacter = () => useGameStore((s) => s.getMyCharacter());
export const useMyPlayer = () => useGameStore((s) => s.getMyPlayer());
export const useDirectives = () => useGameStore((s) => s.gameState?.directives ?? []);
export const useExtendedTasks = () => useGameStore((s) => s.gameState?.extendedTasks ?? {});
export const useInitiative = () => useGameStore((s) => s.gameState?.scene.initiative ?? null);
export const useSceneTraits = () => useGameStore((s) => s.gameState?.scene.traits ?? []);
