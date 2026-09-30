/**
 * Canvas 2D compositor. The SAME code draws the live preview in the browser and
 * every frame of the final export in the worker (@napi-rs/canvas), so what the
 * clipper sees is what gets rendered.
 *
 * Keep this file free of DOM/Node APIs — everything environment-specific comes
 * through CompositorEnv.
 */
import type {
  Anim, AssetInfo, CaptionItem, EffectItem, Filter, ImageItem, Item, StickerItem, TextItem, TextStyle, Timeline,
  Track, Transform, VideoItem, VisualItem,
} from "./types";
import { EMOJI_FONT } from "./presets";
import { ease, isActive, itemEnd, keyframedTransform, previousAdjacent } from "./timeline";

type Ctx = any; // CanvasRenderingContext2D | SKRSContext2D
type Img = any; // CanvasImageSource
export type Frame = { image: Img; width: number; height: number };

export interface CompositorEnv {
  createCanvas(w: number, h: number): any;
  /** Frame of a video clip at timeline time t (t can be past the clip's end during transitions). */
  videoFrame(item: VideoItem, t: number): Frame | null;
  image(assetId: string): Frame | null;
  assets: Record<string, AssetInfo>;
}

export type Bounds = { x: number; y: number; w: number; h: number; rotation: number };

type Mod = { alpha: number; dx: number; dy: number; scale: number; rot: number; blur: number; reveal: number };
const IDENT: Mod = { alpha: 1, dx: 0, dy: 0, scale: 1, rot: 0, blur: 0, reveal: 1 };

/** Deterministic pseudo-random in [0,1) — identical in preview and render. */
export const rand = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };

export function filterString(f?: Filter, extraBlur = 0): string {
  const parts: string[] = [];
  if (f) {
    if (f.brightness !== 1) parts.push(`brightness(${f.brightness})`);
    if (f.contrast !== 1) parts.push(`contrast(${f.contrast})`);
    if (f.saturation !== 1) parts.push(`saturate(${f.saturation})`);
    if (f.hue) parts.push(`hue-rotate(${f.hue}deg)`);
    if (f.sepia) parts.push(`sepia(${f.sepia})`);
    if (f.grayscale) parts.push(`grayscale(${f.grayscale})`);
  }
  const b = (f?.blur || 0) + extraBlur;
  if (b > 0.05) parts.push(`blur(${b.toFixed(1)}px)`);
  return parts.length ? parts.join(" ") : "none";
}

export function fontString(s: Pick<TextStyle, "italic" | "weight" | "size" | "font">, size = s.size) {
  return `${s.italic ? "italic " : ""}${s.weight} ${Math.round(size)}px "${s.font}", "${EMOJI_FONT}", sans-serif`;
}

const backOut = (p: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const bounceOut = (x: number) => {
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
};

function applyAnim(m: Mod, a: Anim | undefined, p: number, W: number) {
  if (!a || a.type === "none" || p >= 1) return;
  p = Math.max(0, p);
  const e = ease("easeOut", p);
  switch (a.type) {
    case "fade": m.alpha *= p; break;
    case "pop": m.scale *= Math.max(0.01, backOut(p)); m.alpha *= Math.min(1, p * 3); break;
    case "zoomIn": m.scale *= 0.4 + 0.6 * e; m.alpha *= p; break;
    case "zoomOut": m.scale *= 1.6 - 0.6 * e; m.alpha *= p; break;
    case "slideUp": m.dy += (1 - e) * 260; m.alpha *= p; break;
    case "slideDown": m.dy -= (1 - e) * 260; m.alpha *= p; break;
    case "slideLeft": m.dx += (1 - e) * W * 0.6; m.alpha *= p; break;
    case "slideRight": m.dx -= (1 - e) * W * 0.6; m.alpha *= p; break;
    case "bounce": m.dy -= (1 - bounceOut(p)) * 420; m.alpha *= Math.min(1, p * 4); break;
    case "spin": m.rot += (1 - e) * -270; m.scale *= Math.max(0.01, e); break;
    case "blur": m.blur += (1 - e) * 24; m.alpha *= p; break;
    case "typewriter": m.reveal = Math.min(m.reveal, p); break;
  }
}

export class Compositor {
  private env: CompositorEnv;
  private scratch: any = null;
  private small: any = null;
  private measureCtx: Ctx;

  constructor(env: CompositorEnv) {
    this.env = env;
    this.measureCtx = env.createCanvas(8, 8).getContext("2d");
  }

  private getScratch(w: number, h: number) {
    if (!this.scratch || this.scratch.width !== w || this.scratch.height !== h) this.scratch = this.env.createCanvas(w, h);
    return this.scratch;
  }

  /** Draw the full frame at time t into ctx (sized to the timeline canvas). */
  render(ctx: Ctx, tl: Timeline, t: number) {
    const { width: W, height: H } = tl.canvas;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.filter = "none";
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    this.drawBackground(ctx, tl, t);
    for (const track of tl.tracks) {
      if (track.hidden || track.kind === "audio") continue;
      if (track.kind === "effect") {
        for (const it of track.items) if (isActive(it, t)) this.applyEffect(ctx, it as EffectItem, t, W, H);
        continue;
      }
      const active = track.items.filter(i => isActive(i, t)).sort((a, b) => a.start - b.start);
      for (const it of active) this.drawWithTransition(ctx, track, it as VisualItem, t, W, H);
    }
    ctx.restore();
  }

  private drawBackground(ctx: Ctx, tl: Timeline, t: number) {
    const bg = tl.canvas.background;
    const { width: W, height: H } = tl.canvas;
    if (bg.type === "color") { ctx.fillStyle = bg.color; ctx.fillRect(0, 0, W, H); return; }
    const main = tl.tracks.find(tr => tr.kind === "video" && !tr.hidden);
    const clip = main?.items.find(i => i.type === "video" && isActive(i, t)) as VideoItem | undefined;
    if (!clip) return;
    const fr = this.env.videoFrame(clip, t);
    if (!fr) return;
    // Blur cheaply: draw into a 1/8-size canvas with a small blur, then upscale.
    const sw = Math.ceil(W / 8), sh = Math.ceil(H / 8);
    if (!this.small || this.small.width !== sw) this.small = this.env.createCanvas(sw, sh);
    const s = this.small.getContext("2d");
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.filter = `blur(${Math.max(1, bg.amount / 8).toFixed(1)}px) ${filterString(clip.filter)}`.replace(" none", "");
    const cover = Math.max(sw / fr.width, sh / fr.height) * 1.15;
    const dw = fr.width * cover, dh = fr.height * cover;
    s.drawImage(fr.image, (sw - dw) / 2, (sh - dh) / 2, dw, dh);
    s.filter = "none";
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.small, 0, 0, sw, sh, 0, 0, W, H);
    if (bg.dim > 0) { ctx.fillStyle = `rgba(0,0,0,${bg.dim})`; ctx.fillRect(0, 0, W, H); }
  }

  private drawWithTransition(ctx: Ctx, track: Track, it: VisualItem, t: number, W: number, H: number) {
    const tr = it.type === "video" ? it.transition : undefined;
    if (tr && tr.type !== "none" && t < it.start + tr.duration) {
      const prev = previousAdjacent(track, it);
      if (prev && prev.type === "video") {
        const p = Math.min(1, Math.max(0, (t - it.start) / Math.max(0.01, tr.duration)));
        const e = ease("easeInOut", p);
        const a: Mod = { ...IDENT }, b: Mod = { ...IDENT };
        let overlay: string | null = null, overlayAlpha = 0;
        switch (tr.type) {
          case "dissolve": b.alpha = e; break;
          case "fadeBlack": case "flash":
            if (p < 0.5) b.alpha = 0; else a.alpha = 0;
            overlay = tr.type === "flash" ? "#fff" : "#000"; overlayAlpha = 1 - Math.abs(2 * p - 1); break;
          case "slideLeft": a.dx = -W * e; b.dx = W * (1 - e); break;
          case "slideRight": a.dx = W * e; b.dx = -W * (1 - e); break;
          case "slideUp": a.dy = -H * e; b.dy = H * (1 - e); break;
          case "slideDown": a.dy = H * e; b.dy = -H * (1 - e); break;
          case "zoomIn": a.scale = 1 + 0.8 * e; a.alpha = 1 - e; b.alpha = e; break;
          case "zoomOut": b.scale = 1.6 - 0.6 * e; b.alpha = e; break;
          case "whip": { const bl = Math.sin(p * Math.PI) * 40; a.dx = -W * e; b.dx = W * (1 - e); a.blur = b.blur = bl; break; }
          case "blur": a.blur = 30 * e; b.blur = 30 * (1 - e); b.alpha = e; break;
        }
        if (a.alpha > 0.001) this.drawItem(ctx, prev as VisualItem, t, a, W);
        if (b.alpha > 0.001) this.drawItem(ctx, it, t, b, W);
        if (overlay && overlayAlpha > 0) {
          ctx.save(); ctx.globalAlpha = overlayAlpha; ctx.fillStyle = overlay; ctx.fillRect(0, 0, W, H); ctx.restore();
        }
        return;
      }
    }
    this.drawItem(ctx, it, t, { ...IDENT }, W);
  }

  /** Transform with keyframes + in/out/loop animations + an extra modifier applied. */
  private animated(it: VisualItem, t: number, extra: Mod, W: number): { tf: Transform; m: Mod } {
    const tf = keyframedTransform(it, t);
    const m: Mod = { ...extra };
    const rel = t - it.start;
    if (it.animIn && it.animIn.type !== "none") applyAnim(m, it.animIn, rel / Math.max(0.01, it.animIn.duration), W);
    if (it.animOut && it.animOut.type !== "none") applyAnim(m, it.animOut, (itemEnd(it) - t) / Math.max(0.01, it.animOut.duration), W);
    const L = it.animLoop;
    if (L && L.type !== "none") {
      const w = 2 * Math.PI * (L.speed || 1) * rel;
      if (L.type === "pulse") m.scale *= 1 + 0.07 * Math.sin(w * 2);
      if (L.type === "wiggle") m.rot += 7 * Math.sin(w * 2);
      if (L.type === "float") m.dy += 14 * Math.sin(w);
      if (L.type === "spin") m.rot += 360 * (L.speed || 1) * rel;
      if (L.type === "shake") { m.dx += 8 * (rand(Math.floor(rel * 30)) - 0.5); m.dy += 8 * (rand(Math.floor(rel * 30) + 7) - 0.5); }
    }
    return { tf, m };
  }

  /** Natural (unscaled) size of an item, canvas px. */
  naturalSize(it: VisualItem): { w: number; h: number } {
    if (it.type === "video" || it.type === "image") {
      const a = this.env.assets[it.assetId];
      let sw = a?.width || 0, sh = a?.height || 0;
      if (!sw || !sh) {
        const fr = it.type === "image" ? this.env.image(it.assetId) : null;
        sw = fr?.width || 1920; sh = fr?.height || 1080;
      }
      return { w: it.crop.w * sw, h: it.crop.h * sh };
    }
    if (it.type === "sticker") {
      if (it.assetId) { const fr = this.env.image(it.assetId); const ar = fr ? fr.height / fr.width : 1; return { w: it.size, h: it.size * ar }; }
      return { w: it.size * 1.2, h: it.size * 1.2 };
    }
    if (it.type === "text") { const l = this.layoutText(this.measureCtx, it.text, it.style); return { w: l.w, h: l.h }; }
    const l = this.layoutCaption(this.measureCtx, it);
    return { w: l.w, h: l.h };
  }

  /** On-canvas box of an item at time t (for selection handles in the editor). */
  bounds(it: VisualItem, t: number, W = 1080): Bounds {
    const { tf } = this.animated(it, t, { ...IDENT }, W);
    const n = this.naturalSize(it);
    return { x: tf.x, y: tf.y, w: n.w * tf.scale, h: n.h * tf.scale, rotation: tf.rotation };
  }

  private drawItem(ctx: Ctx, it: VisualItem, t: number, extra: Mod, W: number) {
    const { tf, m } = this.animated(it, t, extra, W);
    const alpha = tf.opacity * m.alpha;
    if (alpha <= 0.001 || tf.scale * m.scale <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    if (it.blend && it.blend !== "normal") ctx.globalCompositeOperation = it.blend;
    ctx.translate(tf.x + m.dx, tf.y + m.dy);
    const rot = tf.rotation + m.rot;
    if (rot) ctx.rotate((rot * Math.PI) / 180);
    const scale = tf.scale * m.scale;
    switch (it.type) {
      case "video": case "image": this.drawMedia(ctx, it, t, scale, m.blur); break;
      case "sticker": this.drawSticker(ctx, it, scale, m.blur); break;
      case "text": ctx.scale(scale, scale); if (m.blur) ctx.filter = `blur(${m.blur}px)`; this.drawText(ctx, it, m.reveal); break;
      case "caption": ctx.scale(scale, scale); if (m.blur) ctx.filter = `blur(${m.blur}px)`; this.drawCaption(ctx, it, t); break;
    }
    ctx.restore();
  }

  private drawMedia(ctx: Ctx, it: VideoItem | ImageItem, t: number, scale: number, blur: number) {
    const fr = it.type === "video" ? this.env.videoFrame(it, t) : this.env.image(it.assetId);
    if (!fr) return;
    const n = this.naturalSize(it);
    const w = n.w * scale, h = n.h * scale;
    const c = it.crop;
    const sx = c.x * fr.width, sy = c.y * fr.height, sw = c.w * fr.width, sh = c.h * fr.height;
    const r = (it.radius || 0) * (scale / Math.max(0.0001, (it.transform.scale || 1)));
    if (r > 0) {
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(r, w / 2, h / 2)); ctx.clip();
    }
    if (it.type === "video" && it.flipH) ctx.scale(-1, 1);
    ctx.filter = filterString(it.filter, blur);
    ctx.drawImage(fr.image, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
    ctx.filter = "none";
    if (it.border && it.border.width > 0) {
      ctx.lineWidth = it.border.width * 2; ctx.strokeStyle = it.border.color;
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(Math.max(0, r), w / 2, h / 2)); ctx.stroke();
    }
  }

  private drawSticker(ctx: Ctx, it: StickerItem, scale: number, blur: number) {
    if (blur) ctx.filter = `blur(${blur}px)`;
    if (it.assetId) {
      const fr = this.env.image(it.assetId);
      if (!fr) return;
      const w = it.size * scale, h = w * (fr.height / fr.width);
      ctx.drawImage(fr.image, -w / 2, -h / 2, w, h);
      return;
    }
    ctx.scale(scale, scale);
    ctx.font = `${it.size}px "${EMOJI_FONT}", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.fillText(it.emoji || "🔥", 0, it.size * 0.05);
  }

  // ── Text ──────────────────────────────────────────────────────────────────
  private wrap(ctx: Ctx, text: string, maxW: number): string[] {
    const out: string[] = [];
    for (const para of text.split("\n")) {
      const words = para.split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(""); continue; }
      let line = words[0];
      for (let k = 1; k < words.length; k++) {
        const test = line + " " + words[k];
        if (ctx.measureText(test).width > maxW) { out.push(line); line = words[k]; } else line = test;
      }
      out.push(line);
    }
    return out;
  }

  private setFont(ctx: Ctx, s: TextStyle) {
    ctx.font = fontString(s);
    try { ctx.letterSpacing = `${s.letterSpacing || 0}px`; } catch { /* older engines */ }
  }

  layoutText(ctx: Ctx, text: string, s: TextStyle) {
    this.setFont(ctx, s);
    const lines = this.wrap(ctx, s.uppercase ? text.toUpperCase() : text, s.maxWidth);
    const lh = s.size * s.lineHeight;
    const widths = lines.map(l => ctx.measureText(l).width);
    const pad = s.bgColor ? s.bgPadding : 0;
    const w = Math.max(10, ...widths) + pad * 2 + s.strokeWidth * 2;
    const h = lines.length * lh + pad * 2;
    return { lines, widths, lh, w, h };
  }

  private drawText(ctx: Ctx, it: TextItem, reveal: number) {
    const s = it.style;
    const L = this.layoutText(ctx, it.text, s);
    const total = L.lines.reduce((n, l) => n + l.length, 0);
    let budget = reveal >= 1 ? Infinity : Math.floor(total * reveal);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.lineJoin = "round"; ctx.miterLimit = 2;
    const top = -((L.lines.length - 1) * L.lh) / 2;
    const innerW = L.w - (s.bgColor ? s.bgPadding * 2 : 0) - s.strokeWidth * 2;
    L.lines.forEach((line, k) => {
      const lw = L.widths[k];
      const x = s.align === "left" ? -innerW / 2 : s.align === "right" ? innerW / 2 - lw : -lw / 2;
      const y = top + k * L.lh;
      if (s.bgColor) {
        ctx.save(); ctx.fillStyle = s.bgColor;
        ctx.beginPath(); ctx.roundRect(x - s.bgPadding, y - L.lh / 2 - s.bgPadding / 3, lw + s.bgPadding * 2, L.lh + (s.bgPadding * 2) / 3, s.bgRadius); ctx.fill();
        ctx.restore();
      }
      let txt = line;
      if (budget !== Infinity) { txt = line.slice(0, Math.max(0, budget)); budget -= line.length; }
      if (!txt) return;
      this.strokeFill(ctx, txt, x, y, s, s.color);
    });
  }

  private strokeFill(ctx: Ctx, txt: string, x: number, y: number, s: TextStyle, color: string) {
    if (s.shadow > 0) { ctx.shadowColor = s.shadowColor; ctx.shadowBlur = s.shadow; ctx.shadowOffsetY = s.shadow / 4; }
    if (s.strokeWidth > 0) {
      ctx.strokeStyle = s.strokeColor; ctx.lineWidth = s.strokeWidth * 2;
      ctx.strokeText(txt, x, y);
      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    }
    ctx.fillStyle = color;
    ctx.fillText(txt, x, y);
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  }

  // ── Captions ──────────────────────────────────────────────────────────────
  layoutCaption(ctx: Ctx, it: CaptionItem) {
    const s = it.style;
    this.setFont(ctx, s);
    const space = ctx.measureText(" ").width;
    const words = it.words.map(w => ({ ...w, text: s.uppercase ? w.text.toUpperCase() : w.text }));
    const widths = words.map(w => ctx.measureText(w.text).width);
    const lines: number[][] = [];
    let cur: number[] = [], cw = 0;
    words.forEach((_, k) => {
      const add = (cur.length ? space : 0) + widths[k];
      if (cur.length && cw + add > s.maxWidth) { lines.push(cur); cur = []; cw = 0; }
      cw += (cur.length ? space : 0) + widths[k]; cur.push(k);
    });
    if (cur.length) lines.push(cur);
    const lh = s.size * s.lineHeight;
    const lineW = lines.map(l => l.reduce((n, k, j) => n + widths[k] + (j ? space : 0), 0));
    const pad = s.bgColor ? s.bgPadding : 0;
    return { words, widths, lines, lineW, space, lh, w: Math.max(10, ...lineW) + pad * 2 + s.strokeWidth * 2, h: lines.length * lh + pad * 2 };
  }

  private drawCaption(ctx: Ctx, it: CaptionItem, t: number) {
    const s = it.style;
    const rel = t - it.start;
    const L = this.layoutCaption(ctx, it);
    ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.lineJoin = "round"; ctx.miterLimit = 2;
    let active = -1;
    it.words.forEach((w, k) => { if (rel >= w.start) active = k; });
    const top = -((L.lines.length - 1) * L.lh) / 2;
    if (s.bgColor) {
      ctx.save(); ctx.fillStyle = s.bgColor;
      ctx.beginPath(); ctx.roundRect(-L.w / 2, -L.h / 2, L.w, L.h, s.bgRadius); ctx.fill(); ctx.restore();
    }
    L.lines.forEach((line, li) => {
      let x = -L.lineW[li] / 2;
      const y = top + li * L.lh;
      line.forEach(k => {
        const w = L.words[k], ww = L.widths[k];
        const spoken = rel >= it.words[k].start;
        const isActive = k === active && rel < it.words[k].end + 0.25;
        if (s.reveal && !spoken) { x += ww + L.space; return; }
        ctx.save();
        ctx.translate(x + ww / 2, y);
        let sc = 1;
        if (s.popIn && spoken) {
          const p = (rel - it.words[k].start) / 0.14;
          if (p < 1) sc *= 0.75 + 0.25 * backOut(Math.max(0, p));
        }
        if (s.highlight === "scale" && isActive) sc *= 1.18;
        if (sc !== 1) ctx.scale(sc, sc);
        if (s.highlight === "box" && isActive) {
          ctx.fillStyle = s.activeBg;
          const padX = s.size * 0.14, padY = s.size * 0.06;
          ctx.beginPath(); ctx.roundRect(-ww / 2 - padX, -L.lh / 2 + padY, ww + padX * 2, L.lh - padY, s.size * 0.18); ctx.fill();
        }
        const color = isActive && (s.highlight === "color" || s.highlight === "box" || s.highlight === "underline") ? s.activeColor : s.color;
        this.strokeFill(ctx, w.text, -ww / 2, 0, s, color);
        if (s.highlight === "underline" && isActive) {
          ctx.fillStyle = s.activeColor; ctx.fillRect(-ww / 2, s.size * 0.52, ww, Math.max(4, s.size * 0.09));
        }
        ctx.restore();
        x += ww + L.space;
      });
    });
  }

  // ── Effects (applied to everything drawn below the effect track) ───────────
  private applyEffect(ctx: Ctx, fx: EffectItem, t: number, W: number, H: number) {
    const I = fx.intensity ?? 1;
    const rel = t - fx.start;
    const p = rel / Math.max(0.01, fx.duration);
    const redraw = (fn: (c: Ctx, src: any) => void) => {
      const sc = this.getScratch(W, H);
      const s = sc.getContext("2d");
      s.setTransform(1, 0, 0, 1, 0, 0); s.globalAlpha = 1; s.filter = "none";
      s.clearRect(0, 0, W, H); s.drawImage(ctx.canvas, 0, 0);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      fn(ctx, sc);
      ctx.restore();
    };
    const zoom = (z: number, dx = 0, dy = 0, rot = 0) => redraw((c, src) => {
      c.translate(W / 2 + dx, H / 2 + dy); if (rot) c.rotate(rot); c.scale(z, z); c.drawImage(src, -W / 2, -H / 2);
    });
    switch (fx.effect) {
      case "punchIn": zoom(1 + 0.2 * I * ease("easeOut", rel / 0.12)); break;
      case "zoomPulse": { const ph = (rel % 0.5) / 0.5; zoom(1 + 0.08 * I * Math.exp(-ph * 6)); break; }
      case "slowZoom": zoom(1 + 0.16 * I * ease("easeInOut", p)); break;
      case "shake": {
        const f = Math.floor(rel * 30);
        zoom(1.06, (rand(f) - 0.5) * 40 * I, (rand(f + 99) - 0.5) * 40 * I, (rand(f + 7) - 0.5) * 0.03 * I);
        break;
      }
      case "flash": {
        const a = I * Math.pow(Math.max(0, 1 - rel / Math.min(0.45, fx.duration)), 2);
        if (a > 0) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
        break;
      }
      case "vignette": {
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) / 2);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${0.85 * I})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
        break;
      }
      case "bw": redraw((c, src) => { c.filter = `grayscale(${Math.min(1, I)}) contrast(${1 + 0.15 * I})`; c.drawImage(src, 0, 0); }); break;
      case "blurIn": { const b = (1 - ease("easeOut", p)) * 30 * I; if (b > 0.2) redraw((c, src) => { c.filter = `blur(${b.toFixed(1)}px)`; c.drawImage(src, 0, 0); }); break; }
      case "letterbox": {
        const h = H * 0.13 * I;
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h); ctx.restore();
        break;
      }
      case "glitch": {
        const f = Math.floor(rel * 15);
        if (rand(f * 3.1) > 0.35) {
          redraw((c, src) => {
            c.drawImage(src, 0, 0);
            const n = 6 + Math.floor(rand(f) * 6);
            for (let k = 0; k < n; k++) {
              const y = rand(f * 11 + k) * H, h = 20 + rand(f * 13 + k) * 140, dx = (rand(f * 17 + k) - 0.5) * 120 * I;
              c.drawImage(src, 0, y, W, h, dx, y, W, h);
            }
            c.globalCompositeOperation = "screen"; c.globalAlpha = 0.35 * I;
            c.filter = "hue-rotate(90deg)"; c.drawImage(src, 8 * I, 0);
          });
        }
        break;
      }
    }
  }
}

/** Items the render worker needs frames/images for. */
export function referencedAssets(tl: Timeline): Set<string> {
  const s = new Set<string>();
  for (const tr of tl.tracks) for (const i of tr.items as Item[]) if ("assetId" in i && i.assetId) s.add(i.assetId);
  return s;
}
