/** GEOM map icon factory.
 *
 *  Small geometric glyphs drawn on canvas at 2x and registered with
 *  map.addImage(). Colors are baked per category (non-SDF) with a dark
 *  outline so icons stay legible on satellite imagery. Simple silhouettes,
 *  readable at 14-28 px, per the visual spec. */

import type { Map as MLMap } from "maplibre-gl";

const OUTLINE = "#0c1519";
const SIZE = 48; // logical px, drawn at 2x
const RATIO = 2;

type Draw = (ctx: CanvasRenderingContext2D, s: number) => void;

function render(draw: Draw, color: string): ImageData {
  const px = SIZE * RATIO;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(px / 2, px / 2);
  const s = px * 0.42; // glyph half-extent
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // Dark halo pass, then color pass.
  ctx.save();
  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = OUTLINE;
  ctx.lineWidth = px * 0.16;
  draw(ctx, s);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = px * 0.07;
  draw(ctx, s);
  ctx.restore();
  return ctx.getImageData(0, 0, px, px);
}

/* Each glyph draws in a [-1, 1] unit box scaled by s and both fills and
   strokes its own path so the two-pass halo works uniformly. */

const droplet: Draw = (ctx, s) => {
  ctx.beginPath();
  ctx.moveTo(0, -0.72 * s);
  ctx.bezierCurveTo(0.42 * s, -0.18 * s, 0.5 * s, 0.05 * s, 0.5 * s, 0.28 * s);
  ctx.arc(0, 0.28 * s, 0.5 * s, 0, Math.PI, false);
  ctx.bezierCurveTo(-0.5 * s, 0.05 * s, -0.42 * s, -0.18 * s, 0, -0.72 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};

const flame: Draw = (ctx, s) => {
  ctx.beginPath();
  ctx.moveTo(0.05 * s, -0.75 * s);
  ctx.bezierCurveTo(0.15 * s, -0.4 * s, 0.55 * s, -0.3 * s, 0.5 * s, 0.15 * s);
  ctx.bezierCurveTo(0.47 * s, 0.5 * s, 0.25 * s, 0.7 * s, 0, 0.7 * s);
  ctx.bezierCurveTo(-0.3 * s, 0.7 * s, -0.52 * s, 0.45 * s, -0.5 * s, 0.1 * s);
  ctx.bezierCurveTo(-0.48 * s, -0.2 * s, -0.25 * s, -0.35 * s, -0.15 * s, -0.55 * s);
  ctx.bezierCurveTo(-0.05 * s, -0.4 * s, -0.1 * s, -0.62 * s, 0.05 * s, -0.75 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};

const hammer: Draw = (ctx, s) => {
  ctx.beginPath();
  // handle
  ctx.moveTo(-0.55 * s, 0.6 * s);
  ctx.lineTo(0.25 * s, -0.2 * s);
  ctx.lineTo(0.42 * s, -0.03 * s);
  ctx.lineTo(-0.38 * s, 0.77 * s);
  ctx.closePath();
  // head
  ctx.moveTo(0.05 * s, -0.62 * s);
  ctx.lineTo(0.62 * s, -0.05 * s);
  ctx.lineTo(0.44 * s, 0.13 * s);
  ctx.lineTo(-0.13 * s, -0.44 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};

const diamond: Draw = (ctx, s) => {
  ctx.beginPath();
  ctx.moveTo(-0.62 * s, -0.12 * s);
  ctx.lineTo(-0.3 * s, -0.5 * s);
  ctx.lineTo(0.3 * s, -0.5 * s);
  ctx.lineTo(0.62 * s, -0.12 * s);
  ctx.lineTo(0, 0.62 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};

const bolt: Draw = (ctx, s) => {
  ctx.beginPath();
  ctx.moveTo(0.18 * s, -0.72 * s);
  ctx.lineTo(-0.42 * s, 0.1 * s);
  ctx.lineTo(-0.04 * s, 0.1 * s);
  ctx.lineTo(-0.18 * s, 0.72 * s);
  ctx.lineTo(0.42 * s, -0.1 * s);
  ctx.lineTo(0.04 * s, -0.1 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};

const crystal: Draw = (ctx, s) => {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const x = Math.cos(a) * 0.62 * s;
    const y = Math.sin(a) * 0.62 * s;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};

const atom: Draw = (ctx, s) => {
  for (const rot of [0, Math.PI / 3, -Math.PI / 3]) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.66 * s, 0.26 * s, rot, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 0.14 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
};

const trefoil: Draw = (ctx, s) => {
  for (let i = 0; i < 3; i++) {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / 3 - Math.PI / 6;
    ctx.beginPath();
    ctx.arc(0, 0, 0.64 * s, a0, a0 + Math.PI / 3);
    ctx.arc(0, 0, 0.26 * s, a0 + Math.PI / 3, a0, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 0.13 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
};

const waves: Draw = (ctx, s) => {
  for (const y of [-0.26, 0.14]) {
    ctx.beginPath();
    ctx.moveTo(-0.6 * s, y * s + 0.12 * s);
    ctx.bezierCurveTo(
      -0.3 * s, y * s - 0.24 * s,
      -0.05 * s, y * s + 0.4 * s,
      0.25 * s, y * s + 0.05 * s
    );
    ctx.bezierCurveTo(
      0.4 * s, y * s - 0.12 * s,
      0.5 * s, y * s - 0.05 * s,
      0.6 * s, y * s + 0.05 * s
    );
    ctx.stroke();
  }
};

const sun: Draw = (ctx, s) => {
  ctx.beginPath();
  ctx.arc(0, 0, 0.26 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 0.42 * s, Math.sin(a) * 0.42 * s);
    ctx.lineTo(Math.cos(a) * 0.66 * s, Math.sin(a) * 0.66 * s);
    ctx.stroke();
  }
};

const dot: Draw = (ctx, s) => {
  ctx.beginPath();
  ctx.arc(0, 0, 0.3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 0.55 * s, 0, Math.PI * 2);
  ctx.stroke();
};

/** id → [glyph, color]. Colors mirror the layer/category theme. */
export const ICONS: Record<string, [Draw, string]> = {
  "i-oilgas": [droplet, "#e8a33d"],
  "i-base": [hammer, "#b26a4e"],
  "i-precious": [diamond, "#cbc3b1"],
  "i-battery": [bolt, "#2ba57e"],
  "i-ree": [crystal, "#8a75e8"],
  "i-nuclear-plant": [atom, "#8fb4c9"],
  "i-uranium": [trefoil, "#8fb4c9"],
  "i-fossil": [flame, "#c67c1b"],
  "i-hydro": [waves, "#3e90cb"],
  "i-renewable": [sun, "#2ba57e"],
  "i-nuclear-fuel": [atom, "#8fb4c9"],
  "i-other": [dot, "#7e97a6"],
};

export function registerMapIcons(map: MLMap): void {
  for (const [id, [draw, color]] of Object.entries(ICONS)) {
    if (map.hasImage(id)) continue;
    map.addImage(id, render(draw, color), { pixelRatio: RATIO });
  }
}
