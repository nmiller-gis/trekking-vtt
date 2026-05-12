import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import {
  GameState, Player, Character, Ship, EnemyShip, RollResult, Scene, StationType,
  Directive, ExtendedTask, Injury, TaskRollResult,
  evaluateTaskRoll, rollD20,
} from '@lcars-vtt/shared';
import { roomQueries, memberQueries, DbRoom } from './db';

const ROLL_LOG_MAX = 100;
const MOMENTUM_MAX = 6;

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function defaultScene(): Scene {
  return { type: 'social', name: 'New Scene', description: '', roundNumber: 1, traits: [], initiative: null };
}

function emptyGameState(roomCode: string): GameState {
  return {
    roomCode,
    momentum: 0,
    threat: 0,
    scene: defaultScene(),
    players: {},
    characters: {},
    playerShip: null,
    enemyShips: {},
    rollLog: [],
    directives: [],
    extendedTasks: {},
    lastActivity: Date.now(),
  };
}

function loadState(row: DbRoom): GameState {
  try {
    const parsed = JSON.parse(row.game_state);
    if (parsed && typeof parsed === 'object' && parsed.roomCode) {
      return {
        ...emptyGameState(row.room_code),
        ...parsed,
        directives: parsed.directives ?? [],
        extendedTasks: parsed.extendedTasks ?? {},
        scene: {
          ...defaultScene(),
          ...parsed.scene,
          traits: parsed.scene?.traits ?? [],
          initiative: parsed.scene?.initiative ?? null,
        },
      } as GameState;
    }
  } catch { /* fall through */ }
  return emptyGameState(row.room_code);
}

export class GameStateManager {
  private rooms = new Map<string, GameState>();
  private persistTimers = new Map<string, ReturnType<typeof setTimeout>>();

  persist(roomCode: string) {
    const existing = this.persistTimers.get(roomCode);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      const state = this.rooms.get(roomCode);
      if (!state) return;
      const row = roomQueries.findByCode.get(roomCode);
      if (!row) return;
      const persistable = { ...state, players: {} };
      roomQueries.updateState.run(JSON.stringify(persistable), Math.floor(Date.now() / 1000), row.id);
      this.persistTimers.delete(roomCode);
    }, 150);
    this.persistTimers.set(roomCode, timer);
  }

  createRoom(gmSocketId: string, gmUserId: string, gmUsername: string, gmPassword: string, roomName: string): string {
    let roomCode = generateRoomCode();
    while (roomQueries.findByCode.get(roomCode)) roomCode = generateRoomCode();

    const roomId = uuidv4();
    const gmPlayer: Player = {
      id: gmSocketId,
      name: gmUsername,
      characterId: null,
      station: null,
      isGM: true,
      connected: true,
    };

    const state = emptyGameState(roomCode);
    state.players[gmSocketId] = gmPlayer;

    const persistable = { ...state, players: {} };
    roomQueries.insert.run(
      roomId, roomCode, roomName,
      gmUserId, bcrypt.hashSync(gmPassword, 10),
      JSON.stringify(persistable)
    );
    memberQueries.upsert.run(roomId, gmUserId, null, null);

    this.rooms.set(roomCode, state);
    return roomCode;
  }

  joinRoom(
    roomCode: string,
    socketId: string,
    userId: string,
    username: string,
    gmPassword?: string
  ): { state: GameState; isGM: boolean } | { error: string } {
    const row = roomQueries.findByCode.get(roomCode);
    if (!row) return { error: 'Room not found' };

    const isGM = !!gmPassword && bcrypt.compareSync(gmPassword, row.gm_password_hash);

    if (!this.rooms.has(roomCode)) {
      this.rooms.set(roomCode, loadState(row));
    }
    const state = this.rooms.get(roomCode)!;

    const dbMember = memberQueries.findMember.get(row.id, userId);
    let characterId: string | null = null;
    let lastStation: StationType | null = null;

    if (dbMember) {
      lastStation = (dbMember.last_station as StationType) ?? null;
      if (dbMember.character_json) {
        try {
          const char: Character = JSON.parse(dbMember.character_json);
          char.playerId = socketId;
          char.injuries = char.injuries ?? [];
          state.characters[char.id] = char;
          characterId = char.id;
        } catch { /* ignore */ }
      }
    }

    state.players[socketId] = {
      id: socketId,
      name: username,
      characterId,
      station: lastStation,
      isGM,
      connected: true,
    };
    state.lastActivity = Date.now();

    memberQueries.upsert.run(row.id, userId, null, null);
    roomQueries.updateActivity.run(Math.floor(Date.now() / 1000), row.id);

    return { state, isGM };
  }

  getRoom(roomCode: string): GameState | undefined {
    if (this.rooms.has(roomCode)) return this.rooms.get(roomCode);
    const row = roomQueries.findByCode.get(roomCode);
    if (!row) return undefined;
    const state = loadState(row);
    this.rooms.set(roomCode, state);
    return state;
  }

  getPlayer(roomCode: string, playerId: string): Player | undefined {
    return this.rooms.get(roomCode)?.players[playerId];
  }

  isGM(roomCode: string, playerId: string): boolean {
    return this.rooms.get(roomCode)?.players[playerId]?.isGM ?? false;
  }

  removePlayer(roomCode: string, playerId: string, userId?: string, characterId?: string): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    if (state.players[playerId]) {
      state.players[playerId].connected = false;
    }

    if (userId && characterId && state.characters[characterId]) {
      const row = roomQueries.findByCode.get(roomCode);
      if (row) {
        memberQueries.updateCharacter.run(
          JSON.stringify(state.characters[characterId]), row.id, userId
        );
        const station = state.players[playerId]?.station ?? null;
        memberQueries.updateStation.run(station, row.id, userId);
      }
    }

    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  updatePlayerStation(roomCode: string, playerId: string, station: StationType | null, userId?: string): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state?.players[playerId]) return undefined;
    state.players[playerId].station = station;
    state.lastActivity = Date.now();
    if (userId) {
      const row = roomQueries.findByCode.get(roomCode);
      if (row) memberQueries.updateStation.run(station, row.id, userId);
    }
    this.persist(roomCode);
    return state;
  }

  updateMomentum(roomCode: string, delta: number): { state: GameState; overflow: number } | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    const uncapped = state.momentum + delta;
    const overflow = delta > 0 ? Math.max(0, uncapped - MOMENTUM_MAX) : 0;
    state.momentum = Math.max(0, Math.min(MOMENTUM_MAX, uncapped));
    if (overflow > 0) state.threat += overflow;
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return { state, overflow };
  }

  updateThreat(roomCode: string, delta: number): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    state.threat = Math.max(0, state.threat + delta);
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  addRollResult(roomCode: string, result: RollResult): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    state.rollLog.unshift(result);
    if (state.rollLog.length > ROLL_LOG_MAX) state.rollLog = state.rollLog.slice(0, ROLL_LOG_MAX);
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  createCharacter(roomCode: string, playerId: string, userId: string, data: Omit<Character, 'id' | 'playerId'>): Character | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    const character: Character = { ...data, id: uuidv4(), playerId };
    state.characters[character.id] = character;
    if (state.players[playerId]) state.players[playerId].characterId = character.id;
    state.lastActivity = Date.now();

    const row = roomQueries.findByCode.get(roomCode);
    if (row) memberQueries.updateCharacter.run(JSON.stringify(character), row.id, userId);

    this.persist(roomCode);
    return character;
  }

  updateCharacter(roomCode: string, character: Character, requesterId: string, userId?: string): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    const existing = state.characters[character.id];
    if (!existing) return undefined;
    if (existing.playerId !== requesterId && !this.isGM(roomCode, requesterId)) return undefined;
    state.characters[character.id] = character;
    state.lastActivity = Date.now();

    if (userId) {
      const row = roomQueries.findByCode.get(roomCode);
      if (row) memberQueries.updateCharacter.run(JSON.stringify(character), row.id, userId);
    }

    this.persist(roomCode);
    return state;
  }

  updateShip(roomCode: string, ship: Ship): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    state.playerShip = ship;
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  addEnemy(roomCode: string, shipData: Omit<EnemyShip, 'id'>): EnemyShip | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    const ship: EnemyShip = { ...shipData, id: uuidv4() };
    state.enemyShips[ship.id] = ship;
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return ship;
  }

  updateEnemy(roomCode: string, ship: EnemyShip): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state?.enemyShips[ship.id]) return undefined;
    state.enemyShips[ship.id] = ship;
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  removeEnemy(roomCode: string, shipId: string): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    delete state.enemyShips[shipId];
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  revealContact(roomCode: string, shipId: string): EnemyShip | undefined {
    const state = this.rooms.get(roomCode);
    if (!state?.enemyShips[shipId]) return undefined;
    state.enemyShips[shipId].isRevealed = true;
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state.enemyShips[shipId];
  }

  changeScene(roomCode: string, sceneUpdate: Partial<Scene>): { state: GameState; momentumDecayed: boolean } | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    state.scene = { ...state.scene, ...sceneUpdate };
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return { state, momentumDecayed: false };
  }

  endScene(roomCode: string, nextScene: Partial<Scene>): { state: GameState; newMomentum: number; overflow: number } | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    state.momentum = Math.max(0, state.momentum - 1);
    state.scene = { ...state.scene, ...nextScene, traits: [], initiative: null };
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return { state, newMomentum: state.momentum, overflow: 0 };
  }

  advanceRound(roomCode: string): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    state.scene.roundNumber++;
    if (state.scene.initiative) state.scene.initiative.actedThisRound = [];
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  addSceneTrait(roomCode: string, text: string): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    state.scene.traits.push(text);
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  removeSceneTrait(roomCode: string, index: number): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    if (index < 0 || index >= state.scene.traits.length) return undefined;
    state.scene.traits.splice(index, 1);
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  startInitiative(roomCode: string, firstSide: 'players' | 'gm'): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    state.scene.initiative = { active: true, currentSide: firstSide, actedThisRound: [] };
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  endInitiative(roomCode: string): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    state.scene.initiative = null;
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  passInitiative(roomCode: string): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state?.scene.initiative) return undefined;
    state.scene.initiative.currentSide = state.scene.initiative.currentSide === 'players' ? 'gm' : 'players';
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  markActed(roomCode: string, characterId: string): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state?.scene.initiative) return undefined;
    if (!state.scene.initiative.actedThisRound.includes(characterId)) {
      state.scene.initiative.actedThisRound.push(characterId);
    }
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  awardDetermination(roomCode: string, characterId: string): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state?.characters[characterId]) return undefined;
    state.characters[characterId].determination = Math.min(3, state.characters[characterId].determination + 1);
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  updateCrewSupport(roomCode: string, current: number): GameState | undefined {
    const state = this.rooms.get(roomCode);
    if (!state?.playerShip) return undefined;
    state.playerShip.crewSupport.current = Math.max(0, current);
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  spendDetermination(roomCode: string, characterId: string): GameState | { error: string } | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    const char = state.characters[characterId];
    if (!char) return { error: 'Character not found' };
    if (char.determination < 1) return { error: 'No determination to spend' };
    char.determination--;
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  invokeValue(roomCode: string, characterId: string, valueIndex: number): GameState | { error: string } | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    const char = state.characters[characterId];
    if (!char) return { error: 'Character not found' };
    if (char.determination < 1) return { error: 'No determination to invoke' };
    if (!char.values[valueIndex]) return { error: 'Value not found' };
    char.determination--;
    char.values[valueIndex].invoked = true;
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  challengeValue(roomCode: string, characterId: string, valueIndex: number): GameState | { error: string } | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    const char = state.characters[characterId];
    if (!char) return { error: 'Character not found' };
    if (!char.values[valueIndex]) return { error: 'Value not found' };
    if (char.values[valueIndex].challenged) return { error: 'Value already challenged' };
    char.determination = Math.min(3, char.determination + 1);
    char.values[valueIndex].challenged = true;
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  addDirective(roomCode: string, text: string): Directive | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    const directive: Directive = { id: uuidv4(), text, invokedBy: [], challengedBy: [] };
    state.directives.push(directive);
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return directive;
  }

  removeDirective(roomCode: string, directiveId: string): boolean {
    const state = this.rooms.get(roomCode);
    if (!state) return false;
    const idx = state.directives.findIndex((d) => d.id === directiveId);
    if (idx === -1) return false;
    state.directives.splice(idx, 1);
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return true;
  }

  invokeDirective(roomCode: string, directiveId: string, characterId: string): GameState | { error: string } | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    const directive = state.directives.find((d) => d.id === directiveId);
    if (!directive) return { error: 'Directive not found' };
    const char = state.characters[characterId];
    if (!char) return { error: 'Character not found' };
    if (char.determination < 1) return { error: 'No determination to invoke' };
    char.determination--;
    if (!directive.invokedBy.includes(characterId)) directive.invokedBy.push(characterId);
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  challengeDirective(roomCode: string, directiveId: string, characterId: string): GameState | { error: string } | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    const directive = state.directives.find((d) => d.id === directiveId);
    if (!directive) return { error: 'Directive not found' };
    const char = state.characters[characterId];
    if (!char) return { error: 'Character not found' };
    if (directive.challengedBy.includes(characterId)) return { error: 'Already challenged this directive' };
    char.determination = Math.min(3, char.determination + 1);
    directive.challengedBy.push(characterId);
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return state;
  }

  sufferInjury(roomCode: string, characterId: string, description: string, severity: Injury['severity']): Character | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    const char = state.characters[characterId];
    if (!char) return undefined;
    const injury: Injury = { id: uuidv4(), description, severity };
    char.injuries = char.injuries ?? [];
    char.injuries.push(injury);
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return char;
  }

  avoidInjury(roomCode: string, characterId: string, injuryId: string, stressCost: number): Character | { error: string } | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    const char = state.characters[characterId];
    if (!char) return { error: 'Character not found' };
    if (char.stress.current < stressCost) return { error: 'Insufficient stress to avoid injury' };
    char.stress.current -= stressCost;
    char.injuries = (char.injuries ?? []).filter((i) => i.id !== injuryId);
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return char;
  }

  treatInjury(roomCode: string, characterId: string, injuryId: string): Character | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    const char = state.characters[characterId];
    if (!char) return undefined;
    char.injuries = (char.injuries ?? []).filter((i) => i.id !== injuryId);
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return char;
  }

  addExtendedTask(roomCode: string, data: Omit<ExtendedTask, 'id' | 'progress' | 'isComplete'>): ExtendedTask | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    const task: ExtendedTask = { ...data, id: uuidv4(), progress: 0, isComplete: false };
    state.extendedTasks[task.id] = task;
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return task;
  }

  removeExtendedTask(roomCode: string, taskId: string): boolean {
    const state = this.rooms.get(roomCode);
    if (!state?.extendedTasks[taskId]) return false;
    delete state.extendedTasks[taskId];
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return true;
  }

  contributeToTask(roomCode: string, taskId: string, impact: number): ExtendedTask | { error: string } | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    const task = state.extendedTasks[taskId];
    if (!task) return { error: 'Task not found' };
    if (task.isComplete) return { error: 'Task already complete' };
    task.progress = Math.min(task.magnitude, task.progress + Math.max(1, impact));
    if (task.progress >= task.magnitude) task.isComplete = true;
    state.lastActivity = Date.now();
    this.persist(roomCode);
    return task;
  }

  rerollDice(
    roomCode: string,
    rollId: string,
    diceIndices: number[],
    requesterId: string
  ): { updatedRoll: RollResult; momentumDelta: number } | { error: string } | undefined {
    const state = this.rooms.get(roomCode);
    if (!state) return undefined;
    const rollIdx = state.rollLog.findIndex((r) => r.id === rollId);
    if (rollIdx === -1) return { error: 'Roll not found' };
    const roll = state.rollLog[rollIdx];
    if (roll.details.type !== 'task') return { error: 'Can only reroll task rolls' };
    if (roll.playerId !== requesterId && !this.isGM(roomCode, requesterId)) return { error: 'Not authorized' };

    const details = roll.details as TaskRollResult;
    const newDice = [...details.dice];
    for (const idx of diceIndices) {
      if (idx >= 0 && idx < newDice.length) newDice[idx] = rollD20();
    }
    const newEval = evaluateTaskRoll({
      dice: newDice,
      targetNumber: details.targetNumber,
      difficulty: details.difficulty,
      isFocusApplied: details.isFocusApplied,
      focusThreshold: details.isFocusApplied ? newDice.length : 1,
    });
    const momentumDelta = newEval.momentum - details.momentum;

    const updatedRoll: RollResult = {
      ...roll,
      details: { ...details, dice: newDice, ...newEval },
    };
    state.rollLog[rollIdx] = updatedRoll;

    if (momentumDelta !== 0) {
      this.updateMomentum(roomCode, momentumDelta);
    }

    state.lastActivity = Date.now();
    this.persist(roomCode);
    return { updatedRoll, momentumDelta };
  }
}
