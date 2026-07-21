import { Vec2 } from './types';

const elCache: Record<string, HTMLElement> = {};

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  if (!elCache[id]) {
    const el = document.getElementById(id);
    if (el) elCache[id] = el;
    return el as T;
  }
  return elCache[id] as T;
}

export function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export function mouseWorldPos(mouse: { x: number; y: number }, camera: { x: number; y: number }): Vec2 {
  return { x: mouse.x + camera.x, y: mouse.y + camera.y };
}

export function worldToScreen(x: number, y: number, camera: { x: number; y: number }): Vec2 {
  return { x: x - camera.x, y: y - camera.y };
}

export function gridCellCenter(wx: number, wy: number, tileSize: number): Vec2 {
  return {
    x: (Math.floor(wx / tileSize) + 0.5) * tileSize,
    y: (Math.floor(wy / tileSize) + 0.5) * tileSize
  };
}

export function snapAngleToCardinal(a: number): number {
  return Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
}

export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function mixHex(hexA: string, hexB: string, t: number): string {
  const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g2 = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g2},${bl})`;
}

export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
