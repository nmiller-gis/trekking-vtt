import { Character, Injury } from './character';
import { Ship, EnemyShip } from './ship';
import { GameState, Player, RollResult, StationType, Scene, Directive, ExtendedTask, InitiativeState } from './game';

export type DetermSpend = 'moment-of-inspiration' | 'perfect-opportunity' | 'special-technique';

export interface DiceRollParams {
  type: 'task' | 'challenge';
  label?: string;
  numDice?: number;
  targetNumber?: number;
  difficulty?: number;
  isFocusApplied?: boolean;
  focusThreshold?: number;
  numChallengeDice?: number;
  attributeUsed?: string;
  disciplineUsed?: string;
  fixedDice?: number[];
  isAssist?: boolean;
  assistTargetCharId?: string;
}

type AckResult = { success: true } | { error: string };

export interface ClientToServerEvents {
  'create-room': (data: { playerName: string; gmPassword: string }, callback: (result: { roomCode: string } | { error: string }) => void) => void;
  'join-room': (data: { roomCode: string; playerName: string; gmPassword?: string }, callback: (result: { success: true } | { error: string }) => void) => void;
  'leave-room': () => void;

  'select-station': (data: { station: StationType | null }) => void;

  'create-character': (data: { character: Omit<Character, 'id' | 'playerId'> }, callback: (result: { character: Character } | { error: string }) => void) => void;
  'update-character': (data: { character: Character }) => void;

  'dice-roll': (data: DiceRollParams) => void;
  'dice-reroll': (data: { rollId: string; diceIndices: number[] }, callback: (result: AckResult) => void) => void;

  'spend-determination': (data: { characterId: string; type: DetermSpend }, callback: (result: AckResult) => void) => void;

  'invoke-value': (data: { characterId: string; valueIndex: number }, callback: (result: AckResult) => void) => void;
  'challenge-value': (data: { characterId: string; valueIndex: number }, callback: (result: AckResult) => void) => void;

  'gm-add-directive': (data: { text: string }, callback: (result: { directive: Directive } | { error: string }) => void) => void;
  'gm-remove-directive': (data: { directiveId: string }) => void;
  'invoke-directive': (data: { directiveId: string; characterId: string }, callback: (result: AckResult) => void) => void;
  'challenge-directive': (data: { directiveId: string; characterId: string }, callback: (result: AckResult) => void) => void;

  'suffer-injury': (data: { characterId: string; description: string; severity: Injury['severity'] }) => void;
  'avoid-injury': (data: { characterId: string; injuryId: string; stressCost: number }) => void;
  'treat-injury': (data: { characterId: string; injuryId: string }) => void;

  'gm-add-extended-task': (data: Omit<ExtendedTask, 'id' | 'progress' | 'isComplete'>, callback: (result: { task: ExtendedTask } | { error: string }) => void) => void;
  'gm-remove-extended-task': (data: { taskId: string }) => void;
  'contribute-to-task': (data: { taskId: string; impact: number }, callback: (result: AckResult) => void) => void;

  'spend-momentum': (data: { amount: number; reason: string }, callback: (result: AckResult) => void) => void;
  'add-momentum': (data: { amount: number; source: string }) => void;
  'add-threat': (data: { amount: number; reason: string }) => void;

  'gm-update-ship': (data: { ship: Ship }) => void;
  'gm-add-enemy': (data: { ship: Omit<EnemyShip, 'id'> }, callback: (result: { ship: EnemyShip } | { error: string }) => void) => void;
  'gm-update-enemy': (data: { ship: EnemyShip }) => void;
  'gm-remove-enemy': (data: { shipId: string }) => void;
  'gm-reveal-contact': (data: { shipId: string }) => void;
  'gm-change-scene': (data: { scene: Partial<Scene> }) => void;
  'gm-end-scene': (data: { nextScene: Partial<Scene> }) => void;

  'buy-off-complication': (data: { rollId: string; count: number }) => void;
  'dismiss-complication': (data: { rollId: string }) => void;
  'gm-spend-threat': (data: { amount: number; reason: string }, callback: (result: { success: true } | { error: string }) => void) => void;
  'gm-award-determination': (data: { characterId: string; reason: string }) => void;
  'gm-edit-character': (data: { character: Character }) => void;
  'gm-update-crew-support': (data: { current: number }) => void;
  'gm-advance-round': () => void;

  'create-scene-trait': (data: { text: string }, callback: (result: AckResult) => void) => void;
  'remove-scene-trait': (data: { index: number }, callback: (result: AckResult) => void) => void;

  'gm-start-initiative': (data: { firstSide: InitiativeState['currentSide'] }, callback: (result: AckResult) => void) => void;
  'gm-end-initiative': (data: Record<string, never>, callback: (result: AckResult) => void) => void;
  'pass-initiative': (data: Record<string, never>, callback: (result: AckResult) => void) => void;
  'mark-acted': (data: { characterId: string }, callback: (result: AckResult) => void) => void;

  'accept-assist': (data: { fromPlayerId: string }, callback: (result: { bonusDice: number } | { error: string }) => void) => void;
  'decline-assist': (data: { fromPlayerId: string }) => void;
}

export interface ServerToClientEvents {
  'room-joined': (data: { roomCode: string; playerId: string; isGM: boolean }) => void;
  'room-error': (data: { message: string }) => void;
  'room-state': (data: { state: GameState }) => void;

  'player-joined': (data: { player: Player }) => void;
  'player-left': (data: { playerId: string }) => void;
  'player-updated': (data: { player: Player }) => void;

  'momentum-updated': (data: { momentum: number; reason: string; playerId: string }) => void;
  'threat-updated': (data: { threat: number; reason: string }) => void;

  'roll-result': (data: { result: RollResult }) => void;

  'character-updated': (data: { character: Character }) => void;
  'character-created': (data: { character: Character }) => void;

  'ship-updated': (data: { ship: Ship }) => void;

  'enemy-added': (data: { ship: EnemyShip }) => void;
  'enemy-revealed': (data: { ship: EnemyShip }) => void;
  'enemy-updated': (data: { ship: EnemyShip }) => void;
  'enemy-removed': (data: { shipId: string }) => void;

  'scene-changed': (data: { scene: Scene; momentumDecayed: boolean }) => void;

  'complication-occurred': (data: { rollId: string; playerName: string; count: number }) => void;
  'complication-resolved': (data: { rollId: string; boughtOff: boolean }) => void;

  'roll-result-updated': (data: { result: RollResult }) => void;

  'directive-added': (data: { directive: Directive }) => void;
  'directive-removed': (data: { directiveId: string }) => void;
  'directive-updated': (data: { directive: Directive }) => void;

  'extended-task-added': (data: { task: ExtendedTask }) => void;
  'extended-task-updated': (data: { task: ExtendedTask }) => void;
  'extended-task-removed': (data: { taskId: string }) => void;

  'assist-granted': (data: { fromPlayerId: string; fromPlayerName: string; toCharId: string; bonusDice: number }) => void;

  'error': (data: { message: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  roomCode: string | null;
  isGM: boolean;
  playerName: string;
  userId?: string;
}
