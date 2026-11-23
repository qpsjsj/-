export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type Difficulty = 'normal' | 'hard';

export type ObstacleKind =
  | 'cactus_small'
  | 'cactus_tall'
  | 'cactus_double'
  | 'cactus_triple'
  | 'pterodactyl';

export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  x: number;
  y: number;
  width: number;
  height: number;
  animTimer: number;
  wingFrame: 0 | 1;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  twinkleOffset: number;
}

export interface GroundBump {
  x: number;
  width: number;
  height: number;
  yOffset: number;
}

export interface RunSummary {
  score: number;
  jumps: number;
  maxSpeedMultiplier: number;
  durationSec: number;
  isNewBest: boolean;
}

export interface RunRecord {
  id: string;
  score: number;
  difficulty: Difficulty;
  durationSec: number;
  timestamp: number;
}
