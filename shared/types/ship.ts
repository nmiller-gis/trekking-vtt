export interface ShipSystems {
  communications: number;
  computers: number;
  engines: number;
  sensors: number;
  structure: number;
  weapons: number;
}

export interface ShipDepartments {
  command: number;
  conn: number;
  engineering: number;
  medicine: number;
  science: number;
  security: number;
}

export type WeaponQuality =
  | 'area' | 'accurate' | 'cumbersome' | 'calibration'
  | 'devastating' | 'hiddenPower' | 'highYield' | 'jamming'
  | 'persistent' | 'piercing' | 'spread' | 'vicious';

export interface ShipWeapon {
  name: string;
  type: 'energy' | 'torpedo';
  range: 'close' | 'medium' | 'long' | 'extreme';
  damage: number;
  qualities: WeaponQuality[];
  specialProperties?: string;
}

export interface Ship {
  id: string;
  name: string;
  registry: string;

  systems: ShipSystems;
  departments: ShipDepartments;

  scale: number;
  power: { current: number; max: number };
  shields: { current: number; max: number };
  hullIntegrity: { current: number; max: number };
  breaches: number;
  crewSupport: { current: number; max: number };

  traits: string[];
  talents: string[];
  weapons: ShipWeapon[];
}

export interface EnemyShip extends Ship {
  isRevealed: boolean;
  contactDesignation: string;
  weaknessScanned: boolean;
  difficultyReduction: number;
}

export type SystemKey = keyof ShipSystems;
export type DepartmentKey = keyof ShipDepartments;
