export interface ThemePalette {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  nebulaGlow: string;
  nebulaSecondary: string;
  horizonRidge: string;
  horizonHighlight: string;
  planetBody: string;
  planetRing: string;
  moonBody: string;
  moonCrater: string;
  groundLine: string;
  pebble: string;
  dinoBody: string;
  dinoAccent: string;
  dinoVisor: string;
  dinoEye: string;
  cactusBody: string;
  cactusHighlight: string;
  pteroBody: string;
  particle: string;
  star: string;
}

export const SPACE_DEEP_PALETTE: ThemePalette = {
  skyTop: '#050816',
  skyMid: '#0B1228',
  skyBottom: '#131D3B',
  nebulaGlow: 'rgba(56, 189, 248, 0.14)',
  nebulaSecondary: 'rgba(16, 185, 129, 0.10)',
  horizonRidge: '#1B2748',
  horizonHighlight: '#273863',
  planetBody: '#38BDF8',
  planetRing: '#BAE6FD',
  moonBody: '#E2E8F0',
  moonCrater: '#94A3B8',
  groundLine: '#64748B',
  pebble: '#475569',
  dinoBody: '#F8FAFC',
  dinoAccent: '#2DD4BF',
  dinoVisor: 'rgba(56, 189, 248, 0.35)',
  dinoEye: '#0F172A',
  cactusBody: '#10B981',
  cactusHighlight: '#6EE7B7',
  pteroBody: '#CBD5E1',
  particle: '#94A3B8',
  star: '#F8FAFC',
};

export const SPACE_NEBULA_PALETTE: ThemePalette = {
  skyTop: '#0E071B',
  skyMid: '#1B0E35',
  skyBottom: '#28164B',
  nebulaGlow: 'rgba(192, 132, 252, 0.18)',
  nebulaSecondary: 'rgba(45, 212, 191, 0.12)',
  horizonRidge: '#2F1C54',
  horizonHighlight: '#442A78',
  planetBody: '#C084FC',
  planetRing: '#F5D0FE',
  moonBody: '#FDE68A',
  moonCrater: '#D97706',
  groundLine: '#8B5CF6',
  pebble: '#6D28D9',
  dinoBody: '#F8FAFC',
  dinoAccent: '#38BDF8',
  dinoVisor: 'rgba(192, 132, 252, 0.32)',
  dinoEye: '#0F172A',
  cactusBody: '#14B8A6',
  cactusHighlight: '#5EEAD4',
  pteroBody: '#E2E8F0',
  particle: '#A78BFA',
  star: '#F3E8FF',
};

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  u: number
): void {
  ctx.fillRect(Math.round(x * u), Math.round(y * u), Math.round(w * u), Math.round(h * u));
}

export function drawDino(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: {
    legFrame: 0 | 1;
    isAirborne: boolean;
    isDucking: boolean;
    isDead: boolean;
    isBlinking: boolean;
    palette: ThemePalette;
  }
): void {
  const { legFrame, isAirborne, isDucking, isDead, isBlinking, palette } = options;

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  if (isDucking && !isDead) {
    // Ducking dino: 60x30 bounding box (unit = 2.5px -> 24x12 grid)
    const u = 2.5;
    ctx.fillStyle = palette.dinoBody;

    // Tail
    px(ctx, 0, 2, 3, 2, u);
    px(ctx, 2, 3, 4, 3, u);
    // Horizontal torso
    px(ctx, 5, 2, 10, 6, u);
    px(ctx, 7, 1, 7, 1, u);
    // Back spikes accent
    ctx.fillStyle = palette.dinoAccent;
    px(ctx, 6, 1, 1, 1, u);
    px(ctx, 9, 0, 2, 1, u);
    px(ctx, 12, 0, 2, 1, u);

    // Head stretched forward
    ctx.fillStyle = palette.dinoBody;
    px(ctx, 15, 0, 8, 5, u);
    px(ctx, 16, 5, 6, 2, u);
    // Snout notch / jaw
    px(ctx, 20, 4, 4, 1, u);
    px(ctx, 17, 6, 4, 1, u);

    // Eye
    ctx.fillStyle = palette.dinoEye;
    px(ctx, 17, 1, 1.5, 1.5, u);

    // Translucent space visor over head
    ctx.fillStyle = palette.dinoVisor;
    px(ctx, 16, 0, 7, 4, u);

    // Tiny arm
    ctx.fillStyle = palette.dinoBody;
    px(ctx, 14, 7, 2, 2, u);
    px(ctx, 15, 8, 2, 1, u);

    // Running legs
    if (legFrame === 0) {
      px(ctx, 7, 8, 2, 4, u);
      px(ctx, 7, 11, 3, 1, u);
      px(ctx, 11, 8, 2, 2, u);
      px(ctx, 12, 9, 2, 1, u);
    } else {
      px(ctx, 7, 8, 2, 2, u);
      px(ctx, 8, 9, 2, 1, u);
      px(ctx, 11, 8, 2, 4, u);
      px(ctx, 11, 11, 3, 1, u);
    }

    ctx.restore();
    return;
  }

  // Standing / Running / Jumping dino: 44x48 bounding box (unit = 2px -> 22x24 grid)
  const u = 2;
  ctx.fillStyle = palette.dinoBody;

  // Head
  px(ctx, 10, 0, 10, 2, u);
  px(ctx, 9, 1, 12, 6, u);
  // Open jaw / mouth line
  px(ctx, 15, 7, 5, 1, u);
  px(ctx, 9, 6, 6, 3, u);

  // Dorsal crest accent
  ctx.fillStyle = palette.dinoAccent;
  px(ctx, 8, 3, 1, 2, u);
  px(ctx, 7, 7, 1, 2, u);
  px(ctx, 5, 11, 1, 2, u);

  // Eye
  if (isDead) {
    ctx.fillStyle = palette.dinoEye;
    px(ctx, 12, 2, 3, 3, u);
    ctx.fillStyle = palette.dinoBody;
    px(ctx, 13, 3, 1, 1, u);
  } else if (!isBlinking) {
    ctx.fillStyle = palette.dinoEye;
    px(ctx, 12, 2, 2, 2, u);
  }

  // Translucent space visor highlight
  ctx.fillStyle = palette.dinoVisor;
  px(ctx, 10, 1, 11, 4, u);

  // Neck & Torso
  ctx.fillStyle = palette.dinoBody;
  px(ctx, 8, 8, 6, 4, u);
  px(ctx, 5, 10, 9, 7, u);
  px(ctx, 4, 12, 9, 6, u);

  // Tail
  px(ctx, 0, 9, 2, 4, u);
  px(ctx, 2, 11, 2, 5, u);
  px(ctx, 3, 13, 2, 4, u);

  // Tiny arm
  px(ctx, 14, 12, 3, 1.5, u);
  px(ctx, 16, 13, 1, 2, u);

  // Legs
  if (isAirborne || isDead) {
    px(ctx, 5, 18, 2.5, 5, u);
    px(ctx, 5, 22, 4, 1.5, u);
    px(ctx, 10, 18, 2.5, 5, u);
    px(ctx, 10, 22, 4, 1.5, u);
  } else if (legFrame === 0) {
    px(ctx, 5, 18, 2.5, 6, u);
    px(ctx, 5, 22.5, 4, 1.5, u);
    px(ctx, 10, 18, 2.5, 3, u);
    px(ctx, 10, 20, 3.5, 1.5, u);
  } else {
    px(ctx, 5, 18, 2.5, 3, u);
    px(ctx, 5, 20, 3.5, 1.5, u);
    px(ctx, 10, 18, 2.5, 6, u);
    px(ctx, 10, 22.5, 4, 1.5, u);
  }

  ctx.restore();
}

export function drawCactus(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  kind: 'cactus_small' | 'cactus_tall' | 'cactus_double' | 'cactus_triple',
  palette: ThemePalette
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  const drawSingle = (ox: number, w: number, h: number, armStyle: 'left' | 'right' | 'both') => {
    const stemW = Math.max(6, Math.round(w * 0.36));
    const stemX = ox + Math.round((w - stemW) / 2);

    ctx.fillStyle = palette.cactusBody;
    ctx.fillRect(stemX, 2, stemW, h - 2);
    ctx.fillRect(stemX + 2, 0, stemW - 4, 3);

    ctx.fillStyle = palette.cactusHighlight;
    ctx.fillRect(stemX + 2, 4, 2, h - 8);

    ctx.fillStyle = palette.cactusBody;
    const armW = Math.max(4, Math.round(stemW * 0.65));

    if (armStyle === 'left' || armStyle === 'both') {
      const armY = Math.round(h * 0.28);
      const armH = Math.round(h * 0.32);
      ctx.fillRect(ox, armY, armW, armH);
      ctx.fillRect(ox + 1, armY - 2, armW - 2, 2);
      ctx.fillRect(ox, armY + armH - 4, stemX - ox + 1, 5);
    }

    if (armStyle === 'right' || armStyle === 'both') {
      const armY = Math.round(h * 0.36);
      const armH = Math.round(h * 0.3);
      const armX = ox + w - armW;
      ctx.fillRect(armX, armY, armW, armH);
      ctx.fillRect(armX + 1, armY - 2, armW - 2, 2);
      ctx.fillRect(stemX + stemW - 1, armY + armH - 4, armX - (stemX + stemW) + 2, 5);
    }
  };

  if (kind === 'cactus_small' || kind === 'cactus_tall') {
    drawSingle(0, width, height, 'both');
  } else if (kind === 'cactus_double') {
    const unitW = Math.round(width * 0.48);
    drawSingle(0, unitW, height, 'left');
    drawSingle(width - unitW, unitW, Math.round(height * 0.85), 'right');
  } else {
    const unitW = Math.round(width * 0.32);
    drawSingle(0, unitW, Math.round(height * 0.82), 'left');
    drawSingle(Math.round((width - unitW) / 2), unitW, height, 'both');
    drawSingle(width - unitW, unitW, Math.round(height * 0.76), 'right');
  }

  ctx.restore();
}

export function drawPterodactyl(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wingFrame: 0 | 1,
  palette: ThemePalette
): void {
  const u = 2;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  ctx.fillStyle = palette.pteroBody;

  // Beak & Head facing left
  px(ctx, 0, 6, 4, 2, u);
  px(ctx, 3, 5, 5, 4, u);
  // Crest
  px(ctx, 7, 3, 4, 2, u);

  // Eye
  ctx.fillStyle = palette.dinoEye;
  px(ctx, 5, 6, 1, 1, u);

  // Body & Tail
  ctx.fillStyle = palette.pteroBody;
  px(ctx, 8, 7, 9, 4, u);
  px(ctx, 17, 8, 5, 2, u);

  // Animated Wings
  if (wingFrame === 0) {
    px(ctx, 9, 1, 3, 6, u);
    px(ctx, 12, 3, 3, 4, u);
    px(ctx, 10, 0, 2, 2, u);
  } else {
    px(ctx, 9, 11, 4, 5, u);
    px(ctx, 13, 11, 3, 3, u);
    px(ctx, 10, 15, 2, 2, u);
  }

  ctx.restore();
}

export function drawRingedPlanet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  palette: ThemePalette
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  // Back ring arc
  ctx.strokeStyle = palette.planetRing;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.95, radius * 0.48, -0.24, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Planet sphere
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = palette.planetBody;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle shadow crescent
  ctx.fillStyle = palette.skyMid;
  ctx.globalAlpha = 0.32;
  ctx.beginPath();
  ctx.arc(radius * 0.25, radius * 0.15, radius * 0.88, 0, Math.PI * 2);
  ctx.fill();

  // Front ring arc
  ctx.strokeStyle = palette.planetRing;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.95, radius * 0.48, -0.24, 0, Math.PI);
  ctx.stroke();

  ctx.restore();
}

export function drawSpaceMoon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  palette: ThemePalette
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  ctx.fillStyle = palette.moonBody;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Craters
  ctx.fillStyle = palette.moonCrater;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.arc(-radius * 0.35, -radius * 0.2, radius * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(radius * 0.28, radius * 0.28, radius * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(radius * 0.18, -radius * 0.38, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawNebulaWisp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  palette: ThemePalette
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  const r = 38 * scale;
  const grad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  grad.addColorStop(0, palette.nebulaGlow);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.6, r * 0.72, -0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
