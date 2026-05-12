import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  rollTaskDice,
  rollChallengeDice,
  evaluateTaskRoll,
  sumChallengeDice,
  extraDiceCost,
  RollResult,
} from '@lcars-vtt/shared';
import { GameStateManager } from './gameState';
import { verifyToken } from './auth';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const pendingAssists = new Map<string, { fromPlayerId: string; fromPlayerName: string; bonusDice: number }>();

export function registerHandlers(io: TypedServer, socket: TypedSocket, state: GameStateManager) {
  socket.data.roomCode = null;

  const getAuth = (): { userId: string; username: string } | null => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    return { userId: payload.userId, username: payload.username };
  };

  socket.on('create-room', ({ playerName, gmPassword }, callback) => {
    try {
      const auth = getAuth();
      const userId = auth?.userId ?? socket.id;
      const username = auth?.username ?? playerName;

      const roomName = playerName ? `${username}'s Campaign` : 'New Campaign';
      const roomCode = state.createRoom(socket.id, userId, username, gmPassword, roomName);
      socket.data.roomCode = roomCode;
      socket.data.isGM = true;
      socket.data.playerName = username;
      socket.join(roomCode);

      const room = state.getRoom(roomCode)!;
      socket.emit('room-state', { state: room });
      callback({ roomCode });
    } catch (err) {
      callback({ error: String(err) });
    }
  });

  socket.on('join-room', ({ roomCode, playerName, gmPassword }, callback) => {
    const auth = getAuth();
    const userId = auth?.userId ?? socket.id;
    const username = auth?.username ?? playerName;

    const result = state.joinRoom(roomCode, socket.id, userId, username, gmPassword);
    if ('error' in result) {
      callback({ error: result.error });
      return;
    }
    socket.data.roomCode = roomCode;
    socket.data.isGM = result.isGM;
    socket.data.playerName = username;
    socket.data.userId = userId;
    socket.join(roomCode);

    socket.emit('room-state', { state: result.state });
    socket.to(roomCode).emit('player-joined', { player: result.state.players[socket.id] });
    callback({ success: true });
  });

  socket.on('leave-room', () => handleDisconnect());

  socket.on('disconnect', () => handleDisconnect());

  function handleDisconnect() {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const player = state.getPlayer(roomCode, socket.id);
    const charId = player?.characterId ?? undefined;
    const userId = socket.data.userId as string | undefined;
    state.removePlayer(roomCode, socket.id, userId, charId);
    socket.to(roomCode).emit('player-left', { playerId: socket.id });
  }

  socket.on('select-station', ({ station }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const userId = socket.data.userId as string | undefined;
    const updated = state.updatePlayerStation(roomCode, socket.id, station, userId);
    if (!updated) return;
    io.to(roomCode).emit('player-updated', { player: updated.players[socket.id] });
  });

  socket.on('create-character', ({ character }, callback) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) { callback({ error: 'Not in a room' }); return; }
    const auth = getAuth();
    const userId = auth?.userId ?? socket.id;
    const created = state.createCharacter(roomCode, socket.id, userId, character);
    if (!created) { callback({ error: 'Failed to create character' }); return; }
    io.to(roomCode).emit('character-created', { character: created });
    const player = state.getPlayer(roomCode, socket.id);
    if (player) io.to(roomCode).emit('player-updated', { player });
    callback({ character: created });
  });

  socket.on('update-character', ({ character }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const auth = getAuth();
    const userId = auth?.userId ?? socket.id;
    const updated = state.updateCharacter(roomCode, character, socket.id, userId);
    if (!updated) return;
    io.to(roomCode).emit('character-updated', { character: updated.characters[character.id] });
  });

  socket.on('dice-roll', (params) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const room = state.getRoom(roomCode);
    if (!room) return;

    const playerName = socket.data.playerName ?? 'Unknown';
    let result: RollResult;

    if (params.type === 'task') {
      const numDice = Math.min(5, Math.max(2, params.numDice ?? 2));
      const fixedDice = params.fixedDice ?? [];
      const extraDice = Math.max(0, numDice - 2);
      const cost = extraDiceCost(extraDice);

      // Validate and atomically deduct extra dice momentum cost
      if (cost > 0) {
        if (room.momentum < cost) {
          socket.emit('error', { message: 'Insufficient momentum for extra dice' });
          return;
        }
        const deductResult = state.updateMomentum(roomCode, -cost);
        if (deductResult) {
          io.to(roomCode).emit('momentum-updated', {
            momentum: deductResult.state.momentum,
            reason: `Extra dice cost (${extraDice}d20)`,
            playerId: socket.id,
          });
        }
      }

      const targetNumber = params.targetNumber ?? 10;
      const difficulty = params.difficulty ?? 1;
      const isFocusApplied = params.isFocusApplied ?? false;
      const focusThreshold = params.focusThreshold ?? 1;

      // Merge fixed dice (e.g. Perfect Opportunity die = 1) with rolled dice
      const numRolledDice = Math.max(0, numDice - fixedDice.length);
      const dice = [...fixedDice, ...rollTaskDice(numRolledDice)];
      const evaluation = evaluateTaskRoll({ dice, targetNumber, difficulty, isFocusApplied, focusThreshold });

      result = {
        id: uuidv4(),
        timestamp: Date.now(),
        playerId: socket.id,
        playerName,
        label: params.label,
        details: {
          type: 'task',
          dice,
          targetNumber,
          difficulty,
          ...evaluation,
          isFocusApplied,
          attributeUsed: params.attributeUsed ?? '',
          disciplineUsed: params.disciplineUsed ?? '',
        },
      };

      if (evaluation.momentum > 0) {
        const gainResult = state.updateMomentum(roomCode, evaluation.momentum);
        if (gainResult) {
          io.to(roomCode).emit('momentum-updated', {
            momentum: gainResult.state.momentum,
            reason: `${playerName} rolled ${evaluation.momentum} bonus success${evaluation.momentum !== 1 ? 'es' : ''}`,
            playerId: socket.id,
          });
          if (gainResult.overflow > 0) {
            io.to(roomCode).emit('threat-updated', {
              threat: gainResult.state.threat,
              reason: `Momentum overflow (+${gainResult.overflow} to threat)`,
            });
          }
        }
      }

      if (evaluation.complications > 0) {
        io.to(roomCode).emit('complication-occurred', {
          rollId: result.id,
          playerName,
          count: evaluation.complications,
        });
      }

      if (params.isAssist && params.assistTargetCharId && evaluation.successes > 0) {
        const player = state.getPlayer(roomCode, socket.id);
        const assistingChar = player?.characterId ? room.characters[player.characterId] : null;
        const discVal = assistingChar && params.disciplineUsed
          ? (assistingChar.disciplines[params.disciplineUsed as keyof typeof assistingChar.disciplines] ?? 1)
          : 1;
        const bonusDice = Math.min(evaluation.successes, discVal);
        pendingAssists.set(params.assistTargetCharId, {
          fromPlayerId: socket.id,
          fromPlayerName: playerName,
          bonusDice,
        });
        io.to(roomCode).emit('assist-granted', {
          fromPlayerId: socket.id,
          fromPlayerName: playerName,
          toCharId: params.assistTargetCharId,
          bonusDice,
        });
      }
    } else {
      const numDice = Math.max(1, params.numChallengeDice ?? 1);
      const challengeDice = rollChallengeDice(numDice);
      const { totalDamage, effectCount } = sumChallengeDice(challengeDice);

      result = {
        id: uuidv4(),
        timestamp: Date.now(),
        playerId: socket.id,
        playerName,
        label: params.label,
        details: { type: 'challenge', challengeDice, totalDamage, effectCount },
      };
    }

    state.addRollResult(roomCode, result);
    io.to(roomCode).emit('roll-result', { result });
  });

  socket.on('buy-off-complication', ({ rollId, count }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const cost = count * 2;
    const updated = state.updateThreat(roomCode, cost);
    if (!updated) return;
    io.to(roomCode).emit('threat-updated', { threat: updated.threat, reason: `Complication bought off (+${cost} threat)` });
    io.to(roomCode).emit('complication-resolved', { rollId, boughtOff: true });
  });

  socket.on('dismiss-complication', ({ rollId }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    io.to(roomCode).emit('complication-resolved', { rollId, boughtOff: false });
  });

  socket.on('spend-momentum', ({ amount, reason }, callback) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) { callback({ error: 'Not in a room' }); return; }
    const room = state.getRoom(roomCode);
    if (!room) { callback({ error: 'Room not found' }); return; }
    if (room.momentum < amount) { callback({ error: 'Insufficient momentum' }); return; }
    const result = state.updateMomentum(roomCode, -amount);
    if (!result) { callback({ error: 'Failed' }); return; }
    io.to(roomCode).emit('momentum-updated', { momentum: result.state.momentum, reason, playerId: socket.id });
    callback({ success: true });
  });

  socket.on('add-momentum', ({ amount, source }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const result = state.updateMomentum(roomCode, amount);
    if (!result) return;
    io.to(roomCode).emit('momentum-updated', { momentum: result.state.momentum, reason: source, playerId: socket.id });
    if (result.overflow > 0) {
      io.to(roomCode).emit('threat-updated', {
        threat: result.state.threat,
        reason: `Momentum overflow (+${result.overflow} to threat)`,
      });
    }
  });

  socket.on('add-threat', ({ amount, reason }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const updated = state.updateThreat(roomCode, amount);
    if (!updated) return;
    io.to(roomCode).emit('threat-updated', { threat: updated.threat, reason });
  });

  socket.on('dice-reroll', ({ rollId, diceIndices }, callback) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) { callback({ error: 'Not in a room' }); return; }
    const result = state.rerollDice(roomCode, rollId, diceIndices, socket.id);
    if (!result) { callback({ error: 'Room not found' }); return; }
    if ('error' in result) { callback(result); return; }
    io.to(roomCode).emit('roll-result-updated', { result: result.updatedRoll });
    if (result.momentumDelta !== 0) {
      const room = state.getRoom(roomCode);
      if (room) {
        io.to(roomCode).emit('momentum-updated', {
          momentum: room.momentum,
          reason: result.momentumDelta > 0
            ? `Reroll gained ${result.momentumDelta} momentum`
            : `Reroll lost ${Math.abs(result.momentumDelta)} momentum`,
          playerId: socket.id,
        });
      }
    }
    callback({ success: true });
  });

  socket.on('spend-determination', ({ characterId, type }, callback) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) { callback({ error: 'Not in a room' }); return; }
    const result = state.spendDetermination(roomCode, characterId);
    if (!result) { callback({ error: 'Room not found' }); return; }
    if ('error' in result) { callback(result); return; }
    io.to(roomCode).emit('character-updated', { character: result.characters[characterId] });
    callback({ success: true });
  });

  socket.on('invoke-value', ({ characterId, valueIndex }, callback) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) { callback({ error: 'Not in a room' }); return; }
    const result = state.invokeValue(roomCode, characterId, valueIndex);
    if (!result) { callback({ error: 'Room not found' }); return; }
    if ('error' in result) { callback(result); return; }
    io.to(roomCode).emit('character-updated', { character: result.characters[characterId] });
    callback({ success: true });
  });

  socket.on('challenge-value', ({ characterId, valueIndex }, callback) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) { callback({ error: 'Not in a room' }); return; }
    const result = state.challengeValue(roomCode, characterId, valueIndex);
    if (!result) { callback({ error: 'Room not found' }); return; }
    if ('error' in result) { callback(result); return; }
    io.to(roomCode).emit('character-updated', { character: result.characters[characterId] });
    callback({ success: true });
  });

  socket.on('invoke-directive', ({ directiveId, characterId }, callback) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) { callback({ error: 'Not in a room' }); return; }
    const result = state.invokeDirective(roomCode, directiveId, characterId);
    if (!result) { callback({ error: 'Room not found' }); return; }
    if ('error' in result) { callback(result); return; }
    const dir = result.directives.find((d) => d.id === directiveId);
    if (dir) io.to(roomCode).emit('directive-updated', { directive: dir });
    io.to(roomCode).emit('character-updated', { character: result.characters[characterId] });
    callback({ success: true });
  });

  socket.on('challenge-directive', ({ directiveId, characterId }, callback) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) { callback({ error: 'Not in a room' }); return; }
    const result = state.challengeDirective(roomCode, directiveId, characterId);
    if (!result) { callback({ error: 'Room not found' }); return; }
    if ('error' in result) { callback(result); return; }
    const dir = result.directives.find((d) => d.id === directiveId);
    if (dir) io.to(roomCode).emit('directive-updated', { directive: dir });
    io.to(roomCode).emit('character-updated', { character: result.characters[characterId] });
    callback({ success: true });
  });

  socket.on('suffer-injury', ({ characterId, description, severity }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const char = state.sufferInjury(roomCode, characterId, description, severity);
    if (char) io.to(roomCode).emit('character-updated', { character: char });
  });

  socket.on('avoid-injury', ({ characterId, injuryId, stressCost }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const result = state.avoidInjury(roomCode, characterId, injuryId, stressCost);
    if (result && !('error' in result)) io.to(roomCode).emit('character-updated', { character: result });
  });

  socket.on('treat-injury', ({ characterId, injuryId }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const char = state.treatInjury(roomCode, characterId, injuryId);
    if (char) io.to(roomCode).emit('character-updated', { character: char });
  });

  socket.on('contribute-to-task', ({ taskId, impact }, callback) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) { callback({ error: 'Not in a room' }); return; }
    const result = state.contributeToTask(roomCode, taskId, impact);
    if (!result) { callback({ error: 'Room not found' }); return; }
    if ('error' in result) { callback(result); return; }
    io.to(roomCode).emit('extended-task-updated', { task: result });
    callback({ success: true });
  });

  function requireGM(): boolean {
    const roomCode = socket.data.roomCode;
    return !!roomCode && state.isGM(roomCode, socket.id);
  }

  socket.on('gm-add-directive', ({ text }, callback) => {
    if (!requireGM()) { callback({ error: 'Not authorized' }); return; }
    const roomCode = socket.data.roomCode!;
    const directive = state.addDirective(roomCode, text);
    if (!directive) { callback({ error: 'Failed' }); return; }
    io.to(roomCode).emit('directive-added', { directive });
    callback({ directive });
  });

  socket.on('gm-remove-directive', ({ directiveId }) => {
    if (!requireGM()) return;
    const roomCode = socket.data.roomCode!;
    state.removeDirective(roomCode, directiveId);
    io.to(roomCode).emit('directive-removed', { directiveId });
  });

  socket.on('gm-add-extended-task', (data, callback) => {
    if (!requireGM()) { callback({ error: 'Not authorized' }); return; }
    const roomCode = socket.data.roomCode!;
    const task = state.addExtendedTask(roomCode, data);
    if (!task) { callback({ error: 'Failed' }); return; }
    io.to(roomCode).emit('extended-task-added', { task });
    callback({ task });
  });

  socket.on('gm-remove-extended-task', ({ taskId }) => {
    if (!requireGM()) return;
    const roomCode = socket.data.roomCode!;
    state.removeExtendedTask(roomCode, taskId);
    io.to(roomCode).emit('extended-task-removed', { taskId });
  });

  socket.on('gm-update-ship', ({ ship }) => {
    if (!requireGM()) return;
    const roomCode = socket.data.roomCode!;
    const updated = state.updateShip(roomCode, ship);
    if (!updated) return;
    io.to(roomCode).emit('ship-updated', { ship });
  });

  socket.on('gm-add-enemy', ({ ship }, callback) => {
    if (!requireGM()) { callback({ error: 'Not authorized' }); return; }
    const roomCode = socket.data.roomCode!;
    const created = state.addEnemy(roomCode, ship);
    if (!created) { callback({ error: 'Failed' }); return; }
    io.to(roomCode).emit('enemy-added', { ship: created });
    callback({ ship: created });
  });

  socket.on('gm-update-enemy', ({ ship }) => {
    if (!requireGM()) return;
    const roomCode = socket.data.roomCode!;
    const updated = state.updateEnemy(roomCode, ship);
    if (!updated) return;
    io.to(roomCode).emit('enemy-updated', { ship });
  });

  socket.on('gm-remove-enemy', ({ shipId }) => {
    if (!requireGM()) return;
    const roomCode = socket.data.roomCode!;
    state.removeEnemy(roomCode, shipId);
    io.to(roomCode).emit('enemy-removed', { shipId });
  });

  socket.on('gm-reveal-contact', ({ shipId }) => {
    if (!requireGM()) return;
    const roomCode = socket.data.roomCode!;
    const ship = state.revealContact(roomCode, shipId);
    if (!ship) return;
    io.to(roomCode).emit('enemy-revealed', { ship });
  });

  socket.on('gm-change-scene', ({ scene }) => {
    if (!requireGM()) return;
    const roomCode = socket.data.roomCode!;
    const result = state.changeScene(roomCode, scene);
    if (!result) return;
    io.to(roomCode).emit('scene-changed', { scene: result.state.scene, momentumDecayed: false });
  });

  socket.on('gm-end-scene', ({ nextScene }) => {
    if (!requireGM()) return;
    const roomCode = socket.data.roomCode!;
    const result = state.endScene(roomCode, nextScene);
    if (!result) return;
    io.to(roomCode).emit('scene-changed', { scene: result.state.scene, momentumDecayed: true });
    io.to(roomCode).emit('momentum-updated', {
      momentum: result.newMomentum,
      reason: 'Scene ended (−1 momentum decay)',
      playerId: socket.id,
    });
  });

  socket.on('gm-spend-threat', ({ amount, reason }, callback) => {
    if (!requireGM()) { callback({ error: 'Not authorized' }); return; }
    const roomCode = socket.data.roomCode!;
    const room = state.getRoom(roomCode);
    if (!room) { callback({ error: 'Room not found' }); return; }
    if (room.threat < amount) { callback({ error: 'Insufficient threat' }); return; }
    const updated = state.updateThreat(roomCode, -amount);
    if (!updated) { callback({ error: 'Failed' }); return; }
    io.to(roomCode).emit('threat-updated', { threat: updated.threat, reason });
    callback({ success: true });
  });

  socket.on('gm-award-determination', ({ characterId }) => {
    if (!requireGM()) return;
    const roomCode = socket.data.roomCode!;
    const updated = state.awardDetermination(roomCode, characterId);
    if (!updated) return;
    io.to(roomCode).emit('character-updated', { character: updated.characters[characterId] });
  });

  socket.on('gm-edit-character', ({ character }) => {
    if (!requireGM()) return;
    const roomCode = socket.data.roomCode!;
    const updated = state.updateCharacter(roomCode, character, socket.id);
    if (!updated) return;
    io.to(roomCode).emit('character-updated', { character: updated.characters[character.id] });
  });

  socket.on('gm-update-crew-support', ({ current }) => {
    if (!requireGM()) return;
    const roomCode = socket.data.roomCode!;
    const updated = state.updateCrewSupport(roomCode, current);
    if (!updated) return;
    if (updated.playerShip) io.to(roomCode).emit('ship-updated', { ship: updated.playerShip });
  });

  socket.on('gm-advance-round', () => {
    if (!requireGM()) return;
    const roomCode = socket.data.roomCode!;
    const updated = state.advanceRound(roomCode);
    if (!updated) return;
    io.to(roomCode).emit('scene-changed', { scene: updated.scene, momentumDecayed: false });
  });

  socket.on('create-scene-trait', ({ text }, callback) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) { callback({ error: 'Not in a room' }); return; }
    const updated = state.addSceneTrait(roomCode, text);
    if (!updated) { callback({ error: 'Failed' }); return; }
    io.to(roomCode).emit('scene-changed', { scene: updated.scene, momentumDecayed: false });
    callback({ success: true });
  });

  socket.on('remove-scene-trait', ({ index }, callback) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) { callback({ error: 'Not in a room' }); return; }
    if (!state.isGM(roomCode, socket.id)) { callback({ error: 'Not authorized' }); return; }
    const updated = state.removeSceneTrait(roomCode, index);
    if (!updated) { callback({ error: 'Failed' }); return; }
    io.to(roomCode).emit('scene-changed', { scene: updated.scene, momentumDecayed: false });
    callback({ success: true });
  });

  socket.on('gm-start-initiative', ({ firstSide }, callback) => {
    if (!requireGM()) { callback({ error: 'Not authorized' }); return; }
    const roomCode = socket.data.roomCode!;
    const updated = state.startInitiative(roomCode, firstSide);
    if (!updated) { callback({ error: 'Failed' }); return; }
    io.to(roomCode).emit('scene-changed', { scene: updated.scene, momentumDecayed: false });
    callback({ success: true });
  });

  socket.on('gm-end-initiative', (_data, callback) => {
    if (!requireGM()) { callback({ error: 'Not authorized' }); return; }
    const roomCode = socket.data.roomCode!;
    const updated = state.endInitiative(roomCode);
    if (!updated) { callback({ error: 'Failed' }); return; }
    io.to(roomCode).emit('scene-changed', { scene: updated.scene, momentumDecayed: false });
    callback({ success: true });
  });

  socket.on('pass-initiative', (_data, callback) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) { callback({ error: 'Not in a room' }); return; }
    const updated = state.passInitiative(roomCode);
    if (!updated) { callback({ error: 'No active initiative' }); return; }
    io.to(roomCode).emit('scene-changed', { scene: updated.scene, momentumDecayed: false });
    callback({ success: true });
  });

  socket.on('mark-acted', ({ characterId }, callback) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) { callback({ error: 'Not in a room' }); return; }
    const updated = state.markActed(roomCode, characterId);
    if (!updated) { callback({ error: 'No active initiative' }); return; }
    io.to(roomCode).emit('scene-changed', { scene: updated.scene, momentumDecayed: false });
    callback({ success: true });
  });

  socket.on('accept-assist', ({ fromPlayerId }, callback) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) { callback({ error: 'Not in a room' }); return; }
    const player = state.getPlayer(roomCode, socket.id);
    const charId = player?.characterId;
    if (!charId) { callback({ error: 'No character' }); return; }
    const pending = pendingAssists.get(charId);
    if (!pending || pending.fromPlayerId !== fromPlayerId) { callback({ error: 'No pending assist' }); return; }
    pendingAssists.delete(charId);
    callback({ bonusDice: pending.bonusDice });
  });

  socket.on('decline-assist', ({ fromPlayerId }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const player = state.getPlayer(roomCode, socket.id);
    const charId = player?.characterId;
    if (!charId) return;
    const pending = pendingAssists.get(charId);
    if (pending?.fromPlayerId === fromPlayerId) pendingAssists.delete(charId);
  });
}
