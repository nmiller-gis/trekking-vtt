import { create } from 'zustand';
import { GameState, Player, Character, Ship, EnemyShip, RollResult, Scene, Directive, ExtendedTask } from '@lcars-vtt/shared';

export interface ComplicationAlert {
  rollId: string;
  playerName: string;
  count: number;
}

interface GameStore {
  gameState: GameState | null;
  myPlayerId: string | null;
  isGM: boolean;

  setGameState: (state: GameState) => void;
  setMyPlayerId: (id: string, isGM: boolean) => void;

  applyPlayerJoined: (player: Player) => void;
  applyPlayerLeft: (playerId: string) => void;
  applyPlayerUpdated: (player: Player) => void;

  applyMomentumUpdate: (momentum: number) => void;
  applyThreatUpdate: (threat: number) => void;

  applyRollResult: (result: RollResult) => void;

  applyCharacterCreated: (character: Character) => void;
  applyCharacterUpdated: (character: Character) => void;

  applyShipUpdated: (ship: Ship) => void;

  applyEnemyAdded: (ship: EnemyShip) => void;
  applyEnemyRevealed: (ship: EnemyShip) => void;
  applyEnemyUpdated: (ship: EnemyShip) => void;
  applyEnemyRemoved: (shipId: string) => void;

  applySceneChanged: (scene: Scene) => void;

  applyRollResultUpdated: (result: RollResult) => void;

  applyDirectiveAdded: (directive: Directive) => void;
  applyDirectiveRemoved: (directiveId: string) => void;
  applyDirectiveUpdated: (directive: Directive) => void;

  applyExtendedTaskAdded: (task: ExtendedTask) => void;
  applyExtendedTaskUpdated: (task: ExtendedTask) => void;
  applyExtendedTaskRemoved: (taskId: string) => void;

  pendingComplications: ComplicationAlert[];
  addComplication: (alert: ComplicationAlert) => void;
  resolveComplication: (rollId: string) => void;

  getMyCharacter: () => Character | null;
  getMyPlayer: () => Player | null;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  myPlayerId: null,
  isGM: false,
  pendingComplications: [],

  setGameState: (state) => set({ gameState: state }),
  setMyPlayerId: (id, isGM) => set({ myPlayerId: id, isGM }),

  applyPlayerJoined: (player) =>
    set((s) => s.gameState ? {
      gameState: { ...s.gameState, players: { ...s.gameState.players, [player.id]: player } }
    } : s),

  applyPlayerLeft: (playerId) =>
    set((s) => {
      if (!s.gameState) return s;
      const players = { ...s.gameState.players };
      if (players[playerId]) players[playerId] = { ...players[playerId], connected: false };
      return { gameState: { ...s.gameState, players } };
    }),

  applyPlayerUpdated: (player) =>
    set((s) => s.gameState ? {
      gameState: { ...s.gameState, players: { ...s.gameState.players, [player.id]: player } }
    } : s),

  applyMomentumUpdate: (momentum) =>
    set((s) => s.gameState ? { gameState: { ...s.gameState, momentum } } : s),

  applyThreatUpdate: (threat) =>
    set((s) => s.gameState ? { gameState: { ...s.gameState, threat } } : s),

  applyRollResult: (result) =>
    set((s) => {
      if (!s.gameState) return s;
      const rollLog = [result, ...s.gameState.rollLog].slice(0, 100);
      return { gameState: { ...s.gameState, rollLog } };
    }),

  applyCharacterCreated: (character) =>
    set((s) => s.gameState ? {
      gameState: { ...s.gameState, characters: { ...s.gameState.characters, [character.id]: character } }
    } : s),

  applyCharacterUpdated: (character) =>
    set((s) => s.gameState ? {
      gameState: { ...s.gameState, characters: { ...s.gameState.characters, [character.id]: character } }
    } : s),

  applyShipUpdated: (ship) =>
    set((s) => s.gameState ? { gameState: { ...s.gameState, playerShip: ship } } : s),

  applyEnemyAdded: (ship) =>
    set((s) => s.gameState ? {
      gameState: { ...s.gameState, enemyShips: { ...s.gameState.enemyShips, [ship.id]: ship } }
    } : s),

  applyEnemyRevealed: (ship) =>
    set((s) => s.gameState ? {
      gameState: { ...s.gameState, enemyShips: { ...s.gameState.enemyShips, [ship.id]: ship } }
    } : s),

  applyEnemyUpdated: (ship) =>
    set((s) => s.gameState ? {
      gameState: { ...s.gameState, enemyShips: { ...s.gameState.enemyShips, [ship.id]: ship } }
    } : s),

  applyEnemyRemoved: (shipId) =>
    set((s) => {
      if (!s.gameState) return s;
      const enemyShips = { ...s.gameState.enemyShips };
      delete enemyShips[shipId];
      return { gameState: { ...s.gameState, enemyShips } };
    }),

  applySceneChanged: (scene) =>
    set((s) => s.gameState ? { gameState: { ...s.gameState, scene } } : s),

  applyRollResultUpdated: (result) =>
    set((s) => {
      if (!s.gameState) return s;
      const rollLog = s.gameState.rollLog.map((r) => r.id === result.id ? result : r);
      return { gameState: { ...s.gameState, rollLog } };
    }),

  applyDirectiveAdded: (directive) =>
    set((s) => s.gameState ? {
      gameState: { ...s.gameState, directives: [...s.gameState.directives, directive] }
    } : s),

  applyDirectiveRemoved: (directiveId) =>
    set((s) => s.gameState ? {
      gameState: { ...s.gameState, directives: s.gameState.directives.filter((d) => d.id !== directiveId) }
    } : s),

  applyDirectiveUpdated: (directive) =>
    set((s) => s.gameState ? {
      gameState: { ...s.gameState, directives: s.gameState.directives.map((d) => d.id === directive.id ? directive : d) }
    } : s),

  applyExtendedTaskAdded: (task) =>
    set((s) => s.gameState ? {
      gameState: { ...s.gameState, extendedTasks: { ...s.gameState.extendedTasks, [task.id]: task } }
    } : s),

  applyExtendedTaskUpdated: (task) =>
    set((s) => s.gameState ? {
      gameState: { ...s.gameState, extendedTasks: { ...s.gameState.extendedTasks, [task.id]: task } }
    } : s),

  applyExtendedTaskRemoved: (taskId) =>
    set((s) => {
      if (!s.gameState) return s;
      const extendedTasks = { ...s.gameState.extendedTasks };
      delete extendedTasks[taskId];
      return { gameState: { ...s.gameState, extendedTasks } };
    }),

  addComplication: (alert) =>
    set((s) => ({ pendingComplications: [...s.pendingComplications, alert] })),

  resolveComplication: (rollId) =>
    set((s) => ({ pendingComplications: s.pendingComplications.filter((c) => c.rollId !== rollId) })),

  getMyCharacter: () => {
    const { gameState, myPlayerId } = get();
    if (!gameState || !myPlayerId) return null;
    const player = gameState.players[myPlayerId];
    if (!player?.characterId) return null;
    return gameState.characters[player.characterId] ?? null;
  },

  getMyPlayer: () => {
    const { gameState, myPlayerId } = get();
    if (!gameState || !myPlayerId) return null;
    return gameState.players[myPlayerId] ?? null;
  },
}));
