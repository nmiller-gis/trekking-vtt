import { create } from 'zustand';
import { AttributeKey, DisciplineKey } from '@lcars-vtt/shared';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type RightPanel = 'character' | 'ship' | 'gm';
type AppView = 'auth' | 'dashboard' | 'lobby' | 'station-select' | 'play';

interface UIStore {
  view: AppView;
  connectionStatus: ConnectionStatus;
  roomCode: string | null;
  errorMessage: string | null;

  rightPanel: RightPanel;
  diceRollerOpen: boolean;

  pendingRoll: {
    attribute: AttributeKey | null;
    discipline: DisciplineKey | null;
    targetNumber: number;
    difficulty: number;
    extraDice: number;
    focusApplied: boolean;
    label: string;
  };

  pendingPerfectOpportunity: boolean;
  pendingMomentOfInspiration: boolean;
  setPendingPerfectOpportunity: (v: boolean) => void;
  setPendingMomentOfInspiration: (v: boolean) => void;

  pendingAssist: { fromPlayerId: string; fromPlayerName: string; bonusDice: number } | null;
  setPendingAssist: (a: { fromPlayerId: string; fromPlayerName: string; bonusDice: number } | null) => void;

  setView: (view: AppView) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setRoomCode: (code: string | null) => void;
  setErrorMessage: (msg: string | null) => void;
  setRightPanel: (panel: RightPanel) => void;
  setDiceRollerOpen: (open: boolean) => void;
  setPendingRollAttribute: (attr: AttributeKey | null, value: number) => void;
  setPendingRollDiscipline: (disc: DisciplineKey | null, value: number) => void;
  setPendingRollDifficulty: (d: number) => void;
  setPendingRollExtraDice: (n: number) => void;
  setPendingRollFocus: (applied: boolean) => void;
  setPendingRollLabel: (label: string) => void;
  resetPendingRoll: () => void;
}

const defaultPendingRoll = {
  attribute: null as AttributeKey | null,
  discipline: null as DisciplineKey | null,
  targetNumber: 0,
  difficulty: 1,
  extraDice: 0,
  focusApplied: false,
  label: '',
};

export const useUIStore = create<UIStore>((set) => ({
  view: 'auth',
  connectionStatus: 'disconnected',
  roomCode: null,
  errorMessage: null,
  rightPanel: 'character',
  diceRollerOpen: false,
  pendingRoll: { ...defaultPendingRoll },
  pendingPerfectOpportunity: false,
  pendingMomentOfInspiration: false,
  setPendingPerfectOpportunity: (v) => set({ pendingPerfectOpportunity: v }),
  setPendingMomentOfInspiration: (v) => set({ pendingMomentOfInspiration: v }),

  pendingAssist: null,
  setPendingAssist: (a) => set({ pendingAssist: a }),

  setView: (view) => set({ view }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setRoomCode: (code) => set({ roomCode: code }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  setRightPanel: (panel) => set({ rightPanel: panel }),
  setDiceRollerOpen: (open) => set({ diceRollerOpen: open }),

  setPendingRollAttribute: (attribute, value) =>
    set((s) => {
      const discValue = s.pendingRoll.discipline
        ? (s.pendingRoll.targetNumber - (value || 0))
        : 0;
      return {
        pendingRoll: {
          ...s.pendingRoll,
          attribute,
          targetNumber: value + discValue,
        },
      };
    }),

  setPendingRollDiscipline: (discipline, value) =>
    set((s) => {
      const attrValue = s.pendingRoll.attribute
        ? (s.pendingRoll.targetNumber - value)
        : 0;
      return {
        pendingRoll: {
          ...s.pendingRoll,
          discipline,
          targetNumber: attrValue + value,
        },
      };
    }),

  setPendingRollDifficulty: (difficulty) =>
    set((s) => ({ pendingRoll: { ...s.pendingRoll, difficulty } })),

  setPendingRollExtraDice: (extraDice) =>
    set((s) => ({ pendingRoll: { ...s.pendingRoll, extraDice } })),

  setPendingRollFocus: (focusApplied) =>
    set((s) => ({ pendingRoll: { ...s.pendingRoll, focusApplied } })),

  setPendingRollLabel: (label) =>
    set((s) => ({ pendingRoll: { ...s.pendingRoll, label } })),

  resetPendingRoll: () => set({ pendingRoll: { ...defaultPendingRoll } }),
}));
