import { ChallengeDieFace, ChallengeDieResult } from '../types/game';

const CHALLENGE_DIE_FACES: ChallengeDieFace[] = ['one', 'two', 'blank', 'blank', 'blank', 'effect'];

export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

export function rollChallengeDie(): ChallengeDieResult {
  const face = CHALLENGE_DIE_FACES[Math.floor(Math.random() * 6)];
  return {
    face,
    damage: face === 'one' ? 1 : face === 'two' ? 2 : face === 'effect' ? 1 : 0,
  };
}

export interface TaskRollParams {
  dice: number[];
  targetNumber: number;
  difficulty: number;
  isFocusApplied: boolean;
  focusThreshold?: number;
  complicationThreshold?: number;
}

export interface TaskRollEvaluation {
  successes: number;
  momentum: number;
  complications: number;
  isSuccess: boolean;
}

export function evaluateTaskRoll(params: TaskRollParams): TaskRollEvaluation {
  const {
    dice,
    targetNumber,
    difficulty,
    isFocusApplied,
    focusThreshold = 1,
    complicationThreshold = 20,
  } = params;

  let successes = 0;
  let complications = 0;

  for (const die of dice) {
    if (die >= complicationThreshold) {
      complications++;
    }
    if (die <= targetNumber) {
      if (die === 1) {
        successes += 2;
      } else if (isFocusApplied && die <= focusThreshold) {
        successes += 2;
      } else {
        successes += 1;
      }
    }
  }

  const momentum = Math.max(0, successes - difficulty);
  const isSuccess = successes >= difficulty;

  return { successes, momentum, complications, isSuccess };
}

// Cumulative cost to buy extra d20s: 1st costs 1, 2nd costs 2 more (total 3), 3rd costs 3 more (total 6)
export function extraDiceCost(numExtraDice: number): number {
  return (numExtraDice * (numExtraDice + 1)) / 2;
}

export function rollTaskDice(numDice: number): number[] {
  return Array.from({ length: numDice }, rollD20);
}

export function rollChallengeDice(numDice: number): ChallengeDieResult[] {
  return Array.from({ length: numDice }, rollChallengeDie);
}

export function sumChallengeDice(results: ChallengeDieResult[]): { totalDamage: number; effectCount: number } {
  return results.reduce(
    (acc, r) => ({
      totalDamage: acc.totalDamage + r.damage,
      effectCount: acc.effectCount + (r.face === 'effect' ? 1 : 0),
    }),
    { totalDamage: 0, effectCount: 0 }
  );
}
