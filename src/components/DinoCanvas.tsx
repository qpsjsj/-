import React, { useEffect, useImperativeHandle, useRef, forwardRef, useCallback } from 'react';
import {
  Cloud,
  Difficulty,
  GameState,
  GroundBump,
  Obstacle,
  ObstacleKind,
  Particle,
  RunSummary,
  Star,
} from '../game/types';
import { soundEngine } from '../game/sound';
import {
  SPACE_DEEP_PALETTE,
  SPACE_NEBULA_PALETTE,
  drawCactus,
  drawDino,
  drawNebulaWisp,
  drawPterodactyl,
  drawRingedPlanet,
  drawSpaceMoon,
} from '../game/sprites';

export interface DinoCanvasHandle {
  triggerJump: () => void;
  releaseJump: () => void;
  setDucking: (active: boolean) => void;
  startGame: () => void;
  restartGame: () => void;
  togglePause: () => void;
  returnToMenu: () => void;
}

interface DinoCanvasProps {
  gameState: GameState;
  difficulty: Difficulty;
  bestScore: number;
  onGameStateChange: (state: GameState) => void;
  onScoreUpdate: (score: number, speedMultiplier: number, isNight: boolean, milestoneHit: boolean) => void;
  onGameOver: (summary: RunSummary) => void;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
  maxLife: number;
}

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 320;
const GROUND_Y = 264;
const DINO_X = 76;

const DINO_STAND_W = 44;
const DINO_STAND_H = 48;
const DINO_DUCK_W = 60;
const DINO_DUCK_H = 30;

const GRAVITY = 2500;
const JUMP_VELOCITY = -765;

export const DinoCanvas = forwardRef<DinoCanvasHandle, DinoCanvasProps>(function DinoCanvas(
  { gameState, difficulty, bestScore, onGameStateChange, onScoreUpdate, onGameOver },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const engineRef = useRef({
    state: gameState,
    difficulty,
    bestScore,

    // Dino physics
    dinoY: GROUND_Y - DINO_STAND_H,
    dinoVy: 0,
    isAirborne: false,
    isDucking: false,
    jumpHeld: false,
    jumpBufferTimer: 0,
    legFrame: 0 as 0 | 1,
    legTimer: 0,
    blinkTimer: 2.4,
    isBlinking: false,

    // Run metrics
    distance: 0,
    score: 0,
    lastReportedScore: 0,
    lastMilestone: 0,
    jumps: 0,
    elapsedSec: 0,
    maxSpeedMult: 1,
    speed: 390,
    baseSpeed: 390,

    // World entities
    obstacles: [] as Obstacle[],
    nextObstacleId: 1,
    spawnTimer: 0.9,
    particles: [] as Particle[],
    nebulae: [] as Cloud[],
    stars: [] as Star[],
    shootingStars: [] as ShootingStar[],
    shootingStarTimer: 3.2,
    planetX: 250,
    moonX: 790,
    groundBumps: [] as GroundBump[],
    ridgeOffset: 0,
    gameOverTimestamp: 0,
  });

  useEffect(() => {
    engineRef.current.state = gameState;
  }, [gameState]);

  useEffect(() => {
    engineRef.current.difficulty = difficulty;
  }, [difficulty]);

  useEffect(() => {
    engineRef.current.bestScore = bestScore;
  }, [bestScore]);

  const initScenery = useCallback(() => {
    const e = engineRef.current;
    e.nebulae = [
      { x: 180, y: 68, scale: 1.3, speed: 18 },
      { x: 520, y: 95, scale: 1.6, speed: 14 },
      { x: 820, y: 58, scale: 1.2, speed: 22 },
    ];
    e.stars = Array.from({ length: 58 }, (_, idx) => ({
      x: (idx * 73 + 19) % WORLD_WIDTH,
      y: 14 + ((idx * 41) % (GROUND_Y - 46)),
      size: idx % 7 === 0 ? 3 : idx % 3 === 0 ? 2 : 1.5,
      twinkleOffset: idx * 0.55,
    }));
    e.groundBumps = Array.from({ length: 28 }, (_, idx) => ({
      x: idx * 38 + (idx % 3) * 11,
      width: 3 + (idx % 4) * 3,
      height: 2,
      yOffset: 6 + (idx % 5) * 4,
    }));
  }, []);

  useEffect(() => {
    initScenery();
  }, [initScenery]);

  const resetRun = useCallback(() => {
    const e = engineRef.current;
    const base = e.difficulty === 'hard' ? 480 : 390;

    e.dinoY = GROUND_Y - DINO_STAND_H;
    e.dinoVy = 0;
    e.isAirborne = false;
    e.isDucking = false;
    e.jumpHeld = false;
    e.jumpBufferTimer = 0;
    e.legFrame = 0;
    e.legTimer = 0;

    e.distance = 0;
    e.score = 0;
    e.lastReportedScore = 0;
    e.lastMilestone = 0;
    e.jumps = 0;
    e.elapsedSec = 0;
    e.baseSpeed = base;
    e.speed = base;
    e.maxSpeedMult = 1;

    e.obstacles = [];
    e.particles = [];
    e.spawnTimer = 0.75;
    onScoreUpdate(0, 1, false, false);
  }, [onScoreUpdate]);

  const spawnDust = (x: number, y: number, count: number, spreadVy: number) => {
    const e = engineRef.current;
    for (let i = 0; i < count; i++) {
      e.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y - Math.random() * 4,
        vx: -80 - Math.random() * 140,
        vy: -Math.random() * spreadVy,
        size: 2 + Math.floor(Math.random() * 3),
        alpha: 0.85,
        life: 0,
        maxLife: 0.25 + Math.random() * 0.22,
      });
    }
  };

  const executeJump = useCallback(() => {
    const e = engineRef.current;
    if (e.state !== 'PLAYING') return;

    if (!e.isAirborne) {
      e.dinoVy = JUMP_VELOCITY;
      e.isAirborne = true;
      e.isDucking = false;
      e.jumps += 1;
      e.jumpBufferTimer = 0;
      spawnDust(DINO_X + 18, GROUND_Y, 7, 95);
      soundEngine.playJump();
    } else {
      e.jumpBufferTimer = 0.12;
    }
  }, []);

  const startGame = useCallback(() => {
    resetRun();
    engineRef.current.state = 'PLAYING';
    onGameStateChange('PLAYING');
    soundEngine.playJump();
  }, [onGameStateChange, resetRun]);

  const restartGame = useCallback(() => {
    resetRun();
    engineRef.current.state = 'PLAYING';
    onGameStateChange('PLAYING');
    soundEngine.playJump();
  }, [onGameStateChange, resetRun]);

  const togglePause = useCallback(() => {
    const e = engineRef.current;
    if (e.state === 'PLAYING') {
      e.state = 'PAUSED';
      onGameStateChange('PAUSED');
    } else if (e.state === 'PAUSED') {
      e.state = 'PLAYING';
      onGameStateChange('PLAYING');
    }
  }, [onGameStateChange]);

  const returnToMenu = useCallback(() => {
    resetRun();
    engineRef.current.state = 'TITLE_MENU';
    onGameStateChange('TITLE_MENU');
  }, [onGameStateChange, resetRun]);

  useImperativeHandle(
    ref,
    () => ({
      triggerJump: () => {
        const e = engineRef.current;
        e.jumpHeld = true;
        if (e.state === 'TITLE_MENU') {
          startGame();
        } else if (e.state === 'GAME_OVER') {
          if (performance.now() - e.gameOverTimestamp > 280) {
            restartGame();
          }
        } else if (e.state === 'PLAYING') {
          executeJump();
        }
      },
      releaseJump: () => {
        engineRef.current.jumpHeld = false;
      },
      setDucking: (active: boolean) => {
        engineRef.current.isDucking = active;
      },
      startGame,
      restartGame,
      togglePause,
      returnToMenu,
    }),
    [executeJump, restartGame, returnToMenu, startGame, togglePause]
  );

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) {
        return;
      }

      const code = ev.code;
      const e = engineRef.current;

      if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
        ev.preventDefault();
        if (ev.repeat) return;
        e.jumpHeld = true;

        if (e.state === 'TITLE_MENU') {
          startGame();
        } else if (e.state === 'GAME_OVER') {
          if (performance.now() - e.gameOverTimestamp > 280) {
            restartGame();
          }
        } else if (e.state === 'PLAYING') {
          executeJump();
        }
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        ev.preventDefault();
        if (e.state === 'PLAYING') {
          e.isDucking = true;
        }
      } else if (code === 'KeyP' || code === 'Escape') {
        if (e.state === 'PLAYING' || e.state === 'PAUSED') {
          ev.preventDefault();
          togglePause();
        }
      } else if (code === 'Enter') {
        if (e.state === 'TITLE_MENU') {
          ev.preventDefault();
          startGame();
        } else if (e.state === 'GAME_OVER' && performance.now() - e.gameOverTimestamp > 280) {
          ev.preventDefault();
          restartGame();
        }
      }
    };

    const onKeyUp = (ev: KeyboardEvent) => {
      const code = ev.code;
      if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
        engineRef.current.jumpHeld = false;
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        engineRef.current.isDucking = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [executeJump, restartGame, startGame, togglePause]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const spawnObstacle = () => {
      const e = engineRef.current;
      const pteroThreshold = e.difficulty === 'hard' ? 120 : 220;
      const canSpawnPtero = e.score >= pteroThreshold;
      const roll = Math.random();

      let kind: ObstacleKind = 'cactus_small';
      let width = 26;
      let height = 38;
      let y = GROUND_Y - height;

      if (canSpawnPtero && roll < 0.24) {
        kind = 'pterodactyl';
        width = 44;
        height = 34;
        const heightRoll = Math.random();
        if (heightRoll < 0.34) {
          y = GROUND_Y - 38;
        } else if (heightRoll < 0.72) {
          y = GROUND_Y - 64;
        } else {
          y = GROUND_Y - 94;
        }
      } else if (roll < 0.44) {
        kind = 'cactus_small';
        width = 26;
        height = 38;
        y = GROUND_Y - height;
      } else if (roll < 0.68) {
        kind = 'cactus_tall';
        width = 32;
        height = 54;
        y = GROUND_Y - height;
      } else if (roll < 0.87 || e.score < 80) {
        kind = 'cactus_double';
        width = 52;
        height = 44;
        y = GROUND_Y - height;
      } else {
        kind = 'cactus_triple';
        width = 74;
        height = 48;
        y = GROUND_Y - height;
      }

      e.obstacles.push({
        id: e.nextObstacleId++,
        kind,
        x: WORLD_WIDTH + 24,
        y,
        width,
        height,
        animTimer: 0,
        wingFrame: 0,
      });

      const minGap = e.difficulty === 'hard' ? 0.62 : 0.74;
      const speedFactor = Math.max(0.55, 420 / e.speed);
      const randomJitter = Math.random() * 0.58;
      e.spawnTimer = (minGap + randomJitter) * speedFactor + (width > 50 ? 0.14 : 0);
    };

    const step = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const e = engineRef.current;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = WORLD_WIDTH * dpr;
      const targetH = WORLD_HEIGHT * dpr;
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      // Shooting stars update (active in menu & play)
      if (e.state !== 'PAUSED') {
        e.shootingStarTimer -= dt;
        if (e.shootingStarTimer <= 0) {
          e.shootingStarTimer = 3.5 + Math.random() * 5.0;
          e.shootingStars.push({
            x: 240 + Math.random() * (WORLD_WIDTH - 220),
            y: 16 + Math.random() * 65,
            vx: -460 - Math.random() * 180,
            vy: 150 + Math.random() * 80,
            length: 42 + Math.random() * 28,
            life: 0,
            maxLife: 0.45,
          });
        }
        for (let i = e.shootingStars.length - 1; i >= 0; i--) {
          const st = e.shootingStars[i];
          st.life += dt;
          st.x += st.vx * dt;
          st.y += st.vy * dt;
          if (st.life >= st.maxLife) {
            e.shootingStars.splice(i, 1);
          }
        }
      }

      if (e.state === 'TITLE_MENU') {
        e.blinkTimer -= dt;
        if (e.blinkTimer <= 0) {
          if (e.isBlinking) {
            e.isBlinking = false;
            e.blinkTimer = 2.0 + Math.random() * 2.5;
          } else {
            e.isBlinking = true;
            e.blinkTimer = 0.14;
          }
        }
        for (const n of e.nebulae) {
          n.x -= n.speed * 0.5 * dt;
          if (n.x < -120) n.x = WORLD_WIDTH + 100;
        }
        for (const s of e.stars) {
          s.x -= 8 * dt;
          if (s.x < 0) s.x = WORLD_WIDTH;
        }
      }

      if (e.state === 'PLAYING') {
        e.elapsedSec += dt;

        const maxSpeed = e.difficulty === 'hard' ? 1080 : 920;
        const rampRate = e.difficulty === 'hard' ? 11.5 : 8.5;
        e.speed = Math.min(maxSpeed, e.baseSpeed + e.elapsedSec * rampRate);
        const speedMult = Number((e.speed / e.baseSpeed).toFixed(1));
        if (speedMult > e.maxSpeedMult) {
          e.maxSpeedMult = speedMult;
        }

        e.distance += e.speed * dt;
        e.score = Math.floor(e.distance / 28);

        const isNebulaPhase = e.score > 0 && Math.floor(e.score / 700) % 2 === 1;
        const currentMilestone = Math.floor(e.score / 100);
        let milestoneHit = false;
        if (currentMilestone > e.lastMilestone && e.score >= 100) {
          e.lastMilestone = currentMilestone;
          milestoneHit = true;
          soundEngine.playMilestone();
        }

        if (e.score !== e.lastReportedScore || milestoneHit) {
          e.lastReportedScore = e.score;
          onScoreUpdate(e.score, speedMult, isNebulaPhase, milestoneHit);
        }

        if (e.jumpBufferTimer > 0) {
          e.jumpBufferTimer -= dt;
        }

        const activeHeight = !e.isAirborne && e.isDucking ? DINO_DUCK_H : DINO_STAND_H;
        const floorY = GROUND_Y - activeHeight;

        if (e.isAirborne) {
          if (!e.jumpHeld && e.dinoVy < -240) {
            e.dinoVy += GRAVITY * 1.9 * dt;
          }
          const gravityScale = e.isDucking ? 2.65 : 1.0;
          e.dinoVy += GRAVITY * gravityScale * dt;
          e.dinoY += e.dinoVy * dt;

          const landingY = GROUND_Y - (e.isDucking ? DINO_DUCK_H : DINO_STAND_H);
          if (e.dinoY >= landingY) {
            e.dinoY = landingY;
            e.dinoVy = 0;
            e.isAirborne = false;
            spawnDust(DINO_X + 20, GROUND_Y, 5, 65);
            soundEngine.playLand();

            if (e.jumpBufferTimer > 0) {
              executeJump();
            }
          }
        } else {
          e.dinoY = floorY;
          e.legTimer += dt * (e.speed / 380);
          if (e.legTimer >= 0.085) {
            e.legTimer = 0;
            e.legFrame = e.legFrame === 0 ? 1 : 0;
          }
          if (Math.random() < 0.18) {
            spawnDust(DINO_X + 10, GROUND_Y, 1, 35);
          }
        }

        // Cosmic parallax scrolling
        e.ridgeOffset = (e.ridgeOffset + e.speed * 0.14 * dt) % WORLD_WIDTH;
        e.planetX -= e.speed * 0.025 * dt;
        if (e.planetX < -80) e.planetX = WORLD_WIDTH + 90;
        e.moonX -= e.speed * 0.015 * dt;
        if (e.moonX < -50) e.moonX = WORLD_WIDTH + 60;

        for (const s of e.stars) {
          const parallax = s.size >= 3 ? 0.06 : s.size >= 2 ? 0.035 : 0.02;
          s.x -= e.speed * parallax * dt;
          if (s.x < 0) s.x = WORLD_WIDTH;
        }

        for (const n of e.nebulae) {
          n.x -= (n.speed + e.speed * 0.05) * dt;
          if (n.x < -120) {
            n.x = WORLD_WIDTH + 90 + Math.random() * 80;
            n.y = 40 + Math.random() * 90;
          }
        }

        for (const b of e.groundBumps) {
          b.x -= e.speed * dt;
          if (b.x + b.width < 0) {
            b.x = WORLD_WIDTH + Math.random() * 35;
          }
        }

        e.spawnTimer -= dt;
        if (e.spawnTimer <= 0) {
          spawnObstacle();
        }

        for (let i = e.obstacles.length - 1; i >= 0; i--) {
          const obs = e.obstacles[i];
          const obsSpeed = obs.kind === 'pterodactyl' ? e.speed * 1.12 : e.speed;
          obs.x -= obsSpeed * dt;

          if (obs.kind === 'pterodactyl') {
            obs.animTimer += dt;
            if (obs.animTimer >= 0.15) {
              obs.animTimer = 0;
              obs.wingFrame = obs.wingFrame === 0 ? 1 : 0;
            }
          }

          if (obs.x + obs.width < -40) {
            e.obstacles.splice(i, 1);
          }
        }

        for (let i = e.particles.length - 1; i >= 0; i--) {
          const p = e.particles[i];
          p.life += dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 320 * dt;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);
          if (p.life >= p.maxLife) {
            e.particles.splice(i, 1);
          }
        }

        const dinoW = !e.isAirborne && e.isDucking ? DINO_DUCK_W : DINO_STAND_W;
        const dinoH = !e.isAirborne && e.isDucking ? DINO_DUCK_H : DINO_STAND_H;
        const dinoBox = {
          left: DINO_X + 8,
          right: DINO_X + dinoW - 8,
          top: e.dinoY + 6,
          bottom: e.dinoY + dinoH - 5,
        };

        for (const obs of e.obstacles) {
          const insetX = obs.kind === 'pterodactyl' ? 7 : 5;
          const insetY = obs.kind === 'pterodactyl' ? 6 : 5;
          const obsBox = {
            left: obs.x + insetX,
            right: obs.x + obs.width - insetX,
            top: obs.y + insetY,
            bottom: obs.y + obs.height - insetY,
          };

          const hit =
            dinoBox.left < obsBox.right &&
            dinoBox.right > obsBox.left &&
            dinoBox.top < obsBox.bottom &&
            dinoBox.bottom > obsBox.top;

          if (hit) {
            e.state = 'GAME_OVER';
            e.gameOverTimestamp = performance.now();
            soundEngine.playGameOver();
            onGameStateChange('GAME_OVER');
            onGameOver({
              score: e.score,
              jumps: e.jumps,
              maxSpeedMultiplier: e.maxSpeedMult,
              durationSec: Math.round(e.elapsedSec),
              isNewBest: e.score > e.bestScore,
            });
            break;
          }
        }
      }

      // Render Space World
      const isNebulaPhase = e.score > 0 && Math.floor(e.score / 700) % 2 === 1;
      const palette = isNebulaPhase ? SPACE_NEBULA_PALETTE : SPACE_DEEP_PALETTE;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep space sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      skyGrad.addColorStop(0, palette.skyTop);
      skyGrad.addColorStop(0.6, palette.skyMid);
      skyGrad.addColorStop(1, palette.skyBottom);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Ambient cosmic nebula glow
      const ambientGrad = ctx.createRadialGradient(
        WORLD_WIDTH * 0.65,
        90,
        20,
        WORLD_WIDTH * 0.65,
        90,
        340
      );
      ambientGrad.addColorStop(0, palette.nebulaSecondary);
      ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, 0, WORLD_WIDTH, GROUND_Y);

      // Twinkling starfield
      ctx.fillStyle = palette.star;
      for (const s of e.stars) {
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(now * 0.0022 + s.twinkleOffset));
        ctx.globalAlpha = twinkle;
        ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
        if (s.size >= 3) {
          ctx.globalAlpha = twinkle * 0.45;
          ctx.fillRect(Math.round(s.x) - 2, Math.round(s.y) + 1, 7, 1);
          ctx.fillRect(Math.round(s.x) + 1, Math.round(s.y) - 2, 1, 7);
        }
      }
      ctx.globalAlpha = 1;

      // Shooting stars
      for (const st of e.shootingStars) {
        const alpha = Math.sin((st.life / st.maxLife) * Math.PI);
        ctx.save();
        ctx.strokeStyle = palette.star;
        ctx.globalAlpha = alpha * 0.85;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(st.x, st.y);
        const norm = Math.hypot(st.vx, st.vy) || 1;
        ctx.lineTo(st.x - (st.vx / norm) * st.length, st.y - (st.vy / norm) * st.length);
        ctx.stroke();
        ctx.restore();
      }

      // Drifting nebula wisps
      for (const n of e.nebulae) {
        drawNebulaWisp(ctx, n.x, n.y, n.scale, palette);
      }

      // Distant ringed planet & cratered moon
      drawRingedPlanet(ctx, e.planetX, 74, 21, palette);
      drawSpaceMoon(ctx, e.moonX, 56, 15, palette);

      // Distant jagged lunar mountain ridge
      ctx.fillStyle = palette.horizonRidge;
      const drawLunarRidge = (offsetX: number) => {
        ctx.beginPath();
        ctx.moveTo(offsetX, GROUND_Y);
        ctx.lineTo(offsetX + 65, GROUND_Y - 22);
        ctx.lineTo(offsetX + 120, GROUND_Y - 14);
        ctx.lineTo(offsetX + 185, GROUND_Y - 38);
        ctx.lineTo(offsetX + 255, GROUND_Y - 18);
        ctx.lineTo(offsetX + 330, GROUND_Y - 29);
        ctx.lineTo(offsetX + 410, GROUND_Y - 12);
        ctx.lineTo(offsetX + 495, GROUND_Y - 44);
        ctx.lineTo(offsetX + 565, GROUND_Y - 20);
        ctx.lineTo(offsetX + 650, GROUND_Y - 32);
        ctx.lineTo(offsetX + 740, GROUND_Y - 15);
        ctx.lineTo(offsetX + 835, GROUND_Y - 28);
        ctx.lineTo(offsetX + 910, GROUND_Y - 16);
        ctx.lineTo(offsetX + WORLD_WIDTH, GROUND_Y);
        ctx.closePath();
        ctx.fill();
      };
      drawLunarRidge(-e.ridgeOffset);
      drawLunarRidge(WORLD_WIDTH - e.ridgeOffset);

      // Lunar ground strip
      ctx.fillStyle = palette.skyBottom;
      ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, WORLD_HEIGHT - GROUND_Y);

      ctx.fillStyle = palette.groundLine;
      ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, 2);

      // Lunar pebbles & micro-craters
      ctx.fillStyle = palette.pebble;
      for (const b of e.groundBumps) {
        ctx.fillRect(Math.round(b.x), GROUND_Y + b.yOffset, b.width, b.height);
      }

      // Lunar dust particles
      for (const p of e.particles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = palette.particle;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        ctx.restore();
      }

      // Obstacles
      for (const obs of e.obstacles) {
        if (obs.kind === 'pterodactyl') {
          drawPterodactyl(ctx, obs.x, obs.y, obs.wingFrame, palette);
        } else {
          drawCactus(ctx, obs.x, obs.y, obs.width, obs.height, obs.kind, palette);
        }
      }

      // Dino
      drawDino(ctx, DINO_X, e.dinoY, {
        legFrame: e.legFrame,
        isAirborne: e.isAirborne,
        isDucking: !e.isAirborne && e.isDucking,
        isDead: e.state === 'GAME_OVER',
        isBlinking: e.state === 'TITLE_MENU' && e.isBlinking,
        palette,
      });

      ctx.restore();

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [executeJump, onGameOver, onGameStateChange, onScoreUpdate]);

  const handleCanvasPointerDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    ev.preventDefault();
    const e = engineRef.current;
    e.jumpHeld = true;
    if (e.state === 'TITLE_MENU') {
      startGame();
    } else if (e.state === 'PLAYING') {
      executeJump();
    }
  };

  const handleCanvasPointerUp = () => {
    engineRef.current.jumpHeld = false;
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handleCanvasPointerDown}
      onPointerUp={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerUp}
      aria-label="공룡 점프 우주 게임 캔버스"
      className="block w-full aspect-[3/1] touch-none select-none cursor-pointer"
    />
  );
});
