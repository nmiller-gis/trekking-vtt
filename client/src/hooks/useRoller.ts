import { getSocket } from './useSocket';
import { DiceRollParams } from '@lcars-vtt/shared';

export function useRoller() {
  const roll = (params: DiceRollParams) => {
    getSocket().emit('dice-roll', params);
  };

  const rollTask = (params: Omit<DiceRollParams, 'type'>) => {
    roll({ ...params, type: 'task' });
  };

  const rollChallenge = (numDice: number, label?: string) => {
    roll({ type: 'challenge', numChallengeDice: numDice, label });
  };

  return { rollTask, rollChallenge };
}
