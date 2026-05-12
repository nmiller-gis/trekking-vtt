import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@lcars-vtt/shared';
import { useGameStore } from '../store/gameStore';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketInstance: AppSocket | null = null;
let listenersRegistered = false;

export function getSocket(): AppSocket {
  if (!socketInstance) {
    const token = useAuthStore.getState().token;
    socketInstance = io({
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
    });
  }
  return socketInstance;
}

function registerListeners(socket: AppSocket) {
  socket.on('connect', () => useUIStore.getState().setConnectionStatus('connected'));
  socket.on('disconnect', () => useUIStore.getState().setConnectionStatus('disconnected'));
  socket.on('connect_error', () => useUIStore.getState().setConnectionStatus('error'));

  socket.on('room-state', ({ state }) => useGameStore.getState().setGameState(state));
  socket.on('player-joined', ({ player }) => useGameStore.getState().applyPlayerJoined(player));
  socket.on('player-left', ({ playerId }) => useGameStore.getState().applyPlayerLeft(playerId));
  socket.on('player-updated', ({ player }) => useGameStore.getState().applyPlayerUpdated(player));
  socket.on('momentum-updated', ({ momentum }) => useGameStore.getState().applyMomentumUpdate(momentum));
  socket.on('threat-updated', ({ threat }) => useGameStore.getState().applyThreatUpdate(threat));
  socket.on('roll-result', ({ result }) => useGameStore.getState().applyRollResult(result));
  socket.on('character-created', ({ character }) => useGameStore.getState().applyCharacterCreated(character));
  socket.on('character-updated', ({ character }) => useGameStore.getState().applyCharacterUpdated(character));
  socket.on('ship-updated', ({ ship }) => useGameStore.getState().applyShipUpdated(ship));
  socket.on('enemy-added', ({ ship }) => useGameStore.getState().applyEnemyAdded(ship));
  socket.on('enemy-revealed', ({ ship }) => useGameStore.getState().applyEnemyRevealed(ship));
  socket.on('enemy-updated', ({ ship }) => useGameStore.getState().applyEnemyUpdated(ship));
  socket.on('enemy-removed', ({ shipId }) => useGameStore.getState().applyEnemyRemoved(shipId));
  socket.on('scene-changed', ({ scene }) => useGameStore.getState().applySceneChanged(scene));
  socket.on('complication-occurred', (data) => useGameStore.getState().addComplication(data));
  socket.on('complication-resolved', ({ rollId }) => useGameStore.getState().resolveComplication(rollId));
  socket.on('roll-result-updated', ({ result }) => useGameStore.getState().applyRollResultUpdated(result));
  socket.on('directive-added', ({ directive }) => useGameStore.getState().applyDirectiveAdded(directive));
  socket.on('directive-removed', ({ directiveId }) => useGameStore.getState().applyDirectiveRemoved(directiveId));
  socket.on('directive-updated', ({ directive }) => useGameStore.getState().applyDirectiveUpdated(directive));
  socket.on('extended-task-added', ({ task }) => useGameStore.getState().applyExtendedTaskAdded(task));
  socket.on('extended-task-updated', ({ task }) => useGameStore.getState().applyExtendedTaskUpdated(task));
  socket.on('extended-task-removed', ({ taskId }) => useGameStore.getState().applyExtendedTaskRemoved(taskId));
  socket.on('assist-granted', ({ fromPlayerId, fromPlayerName, toCharId, bonusDice }) => {
    const myChar = useGameStore.getState().getMyCharacter();
    if (myChar?.id === toCharId) {
      useUIStore.getState().setPendingAssist({ fromPlayerId, fromPlayerName, bonusDice });
    }
  });
  socket.on('error', ({ message }) => useUIStore.getState().setErrorMessage(message));
}

export function useSocketSetup() {
  useEffect(() => {
    if (listenersRegistered) return;
    listenersRegistered = true;

    const socket = getSocket();
    registerListeners(socket);
    socket.connect();
    useUIStore.getState().setConnectionStatus('connecting');
  }, []);

  useEffect(() => {
    return useAuthStore.subscribe((auth, prev) => {
      if (auth.token === prev.token) return;

      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance.off();
        socketInstance = null;
        listenersRegistered = false;
      }

      if (auth.token) {
        const socket = getSocket();
        registerListeners(socket);
        listenersRegistered = true;
        socket.connect();
        useUIStore.getState().setConnectionStatus('connecting');
      }
    });
  }, []);
}
