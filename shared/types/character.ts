export interface Attributes {
  control: number;
  daring: number;
  fitness: number;
  insight: number;
  presence: number;
  reason: number;
}

export interface Disciplines {
  command: number;
  conn: number;
  engineering: number;
  medicine: number;
  science: number;
  security: number;
}

export interface Value {
  text: string;
  invoked: boolean;
  challenged: boolean;
}

export interface Talent {
  name: string;
  description: string;
  source?: string;
}

export interface Injury {
  id: string;
  description: string;
  severity: 'stun' | 'deadly';
}

export interface Character {
  id: string;
  playerId: string;

  name: string;
  pronouns: string;
  species: string;
  rank: string;
  role: string;
  assignment: string;

  attributes: Attributes;
  disciplines: Disciplines;

  values: Value[];
  focuses: string[];
  talents: Talent[];
  traits: string[];

  stress: { current: number; max: number };
  determination: number;
  resistance: number;
  injuries: Injury[];
}

export type AttributeKey = keyof Attributes;
export type DisciplineKey = keyof Disciplines;
