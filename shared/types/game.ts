import { Character } from './character';
import { Ship, EnemyShip } from './ship';

export type SceneType = 'social' | 'action' | 'ship-combat' | 'hazard';

export type StationType =
  | 'command'
  | 'conn'
  | 'tactical'
  | 'science'
  | 'communications'
  | 'engineering';

export interface Player {
  id: string;
  name: string;
  characterId: string | null;
  station: StationType | null;
  isGM: boolean;
  connected: boolean;
}

export type ChallengeDieFace = 'one' | 'two' | 'blank' | 'effect';

export interface ChallengeDieResult {
  face: ChallengeDieFace;
  damage: number;
}

export interface TaskRollResult {
  type: 'task';
  dice: number[];
  targetNumber: number;
  difficulty: number;
  successes: number;
  momentum: number;
  complications: number;
  isSuccess: boolean;
  isFocusApplied: boolean;
  attributeUsed: string;
  disciplineUsed: string;
}

export interface ChallengeRollResult {
  type: 'challenge';
  challengeDice: ChallengeDieResult[];
  totalDamage: number;
  effectCount: number;
}

export type RollDetails = TaskRollResult | ChallengeRollResult;

export interface RollResult {
  id: string;
  timestamp: number;
  playerId: string;
  playerName: string;
  label?: string;
  details: RollDetails;
}

export interface InitiativeState {
  active: boolean;
  currentSide: 'players' | 'gm';
  actedThisRound: string[];
}

export interface Scene {
  type: SceneType;
  name: string;
  description: string;
  roundNumber: number;
  traits: string[];
  initiative: InitiativeState | null;
}

export interface Directive {
  id: string;
  text: string;
  invokedBy: string[];
  challengedBy: string[];
}

export interface ExtendedTask {
  id: string;
  name: string;
  magnitude: number;
  progress: number;
  difficulty: number;
  resistance: number;
  isComplete: boolean;
}

export interface GameState {
  roomCode: string;
  momentum: number;
  threat: number;
  scene: Scene;
  players: Record<string, Player>;
  characters: Record<string, Character>;
  playerShip: Ship | null;
  enemyShips: Record<string, EnemyShip>;
  rollLog: RollResult[];
  directives: Directive[];
  extendedTasks: Record<string, ExtendedTask>;
  lastActivity: number;
}
