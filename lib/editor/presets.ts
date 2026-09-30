import type {
  AssetInfo, CaptionStyle, Crop, EffectType, Filter, TextStyle, Timeline, Transform, TransitionType, AnimType,
  LoopAnimType, VideoItem,
} from "./types";
import { TIMELINE_VERSION } from "./types";

export const CANVAS_W = 1080;
export const CANVAS_H = 1920;

/** Fonts bundled in /public/fonts (all SIL OFL), one static file per weight so the
 * browser and the worker (Skia) pick identical glyphs. */
export const FONTS: { family: string; files: Record<number, string> }[] = [
  { family: "Montserrat", files: { 400: "Montserrat-400.ttf", 600: "Montserrat-600.ttf", 800: "Montserrat-800.ttf", 900: "Montserrat-900.ttf" } },
  { family: "Anton", files: { 400: "Anton.ttf" } },
  { family: "Bebas Neue", files: { 400: "BebasNeue.ttf" } },
  { family: "Poppins", files: { 700: "Poppins-Bold.ttf" } },
  { family: "Bangers", files: { 400: "Bangers.ttf" } },
  { family: "Inter", files: { 400: "Inter-400.ttf", 600: "Inter-600.ttf", 800: "Inter-800.ttf" } },
];
export const fontWeights = (family: string) => Object.keys(FONTS.find(f => f.family === family)?.files || { 400: 1 }).map(Number);
export const EMOJI_FONT = "Noto Color Emoji";

export const defaultTransform = (x = CANVAS_W / 2, y = CANVAS_H / 2, scale = 1): Transform =>
  ({ x, y, scale, rotation: 0, opacity: 1 });

export const FULL_CROP: Crop = { x: 0, y: 0, w: 1, h: 1 };

export const defaultFilter = (): Filter =>
  ({ brightness: 1, contrast: 1, saturation: 1, hue: 0, blur: 0, sepia: 0, grayscale: 0 });

export const FILTER_PRESETS: { id: string; name: string; filter: Partial<Filter> }[] = [
  { id: "none", name: "Original", filter: {} },
  { id: "vivid", name: "Vivid", filter: { saturation: 1.45, contrast: 1.12 } },
  { id: "punch", name: "Punch", filter: { saturation: 1.3, contrast: 1.3, brightness: 1.03 } },
  { id: "warm", name: "Warm", filter: { sepia: 0.25, saturation: 1.15, brightness: 1.03 } },
  { id: "cool", name: "Cool", filter: { hue: -12, saturation: 1.1, brightness: 1.02 } },
  { id: "film", name: "Film", filter: { sepia: 0.18, contrast: 0.92, saturation: 0.85, brightness: 1.05 } },
  { id: "moody", name: "Moody", filter: { contrast: 1.2, saturation: 0.75, brightness: 0.92 } },
  { id: "bright", name: "Bright", filter: { brightness: 1.15, contrast: 1.05 } },
  { id: "bw", name: "B&W", filter: { grayscale: 1, contrast: 1.15 } },
  { id: "noir", name: "Noir", filter: { grayscale: 1, contrast: 1.5, brightness: 0.9 } },
  { id: "retro", name: "Retro", filter: { sepia: 0.55, contrast: 1.1, saturation: 1.2, hue: -8 } },
  { id: "neon", name: "Neon", filter: { saturation: 1.8, contrast: 1.2, hue: 12 } },
];
export function applyFilterPreset(id: string): Filter {
  const p = FILTER_PRESETS.find(p => p.id === id);
  return { ...defaultFilter(), ...(p?.filter || {}), preset: id };
}

export const defaultTextStyle = (): TextStyle => ({
  font: "Montserrat", weight: 800, size: 72, color: "#ffffff", strokeColor: "#000000", strokeWidth: 8,
  bgPadding: 18, bgRadius: 16, shadow: 0, shadowColor: "rgba(0,0,0,0.6)", align: "center", uppercase: false,
  italic: false, letterSpacing: 0, lineHeight: 1.15, maxWidth: 900,
});

export const TEXT_PRESETS: { id: string; name: string; style: Partial<TextStyle> }[] = [
  { id: "classic", name: "Classic", style: {} },
  { id: "headline", name: "Headline", style: { font: "Anton", weight: 400, size: 96, uppercase: true, strokeWidth: 0, shadow: 18 } },
  { id: "boxed", name: "Boxed", style: { color: "#000000", strokeWidth: 0, bgColor: "#ffffff", size: 60, weight: 800 } },
  { id: "red-box", name: "Red box", style: { color: "#ffffff", strokeWidth: 0, bgColor: "#ff2d55", size: 60, weight: 800 } },
  { id: "yellow", name: "Yellow pop", style: { color: "#ffe600", strokeWidth: 10, size: 84, font: "Bangers", weight: 400, letterSpacing: 2 } },
  { id: "minimal", name: "Minimal", style: { font: "Inter", weight: 600, size: 54, strokeWidth: 0, shadow: 12 } },
  { id: "bebas", name: "Tall", style: { font: "Bebas Neue", weight: 400, size: 110, strokeWidth: 6, letterSpacing: 2 } },
  { id: "news", name: "News bar", style: { font: "Poppins", weight: 700, size: 48, color: "#ffffff", strokeWidth: 0, bgColor: "rgba(0,0,0,0.75)", bgRadius: 6, align: "left", maxWidth: 980 } },
];

const capBase = (): CaptionStyle => ({
  ...defaultTextStyle(),
  preset: "bold", size: 78, weight: 900, uppercase: true, strokeWidth: 10, maxWidth: 920, lineHeight: 1.1,
  activeColor: "#ffe600", activeBg: "#9146ff", highlight: "color", reveal: false, popIn: true, wordsPerChunk: 3,
});
export const CAPTION_PRESETS: { id: string; name: string; style: Partial<CaptionStyle> }[] = [
  { id: "bold", name: "Bold pop", style: {} },
  { id: "karaoke", name: "Karaoke box", style: { highlight: "box", activeBg: "#9146ff", activeColor: "#ffffff", popIn: false } },
  { id: "green", name: "Money green", style: { activeColor: "#39ff14", font: "Anton", weight: 400, size: 88, strokeWidth: 9 } },
  { id: "one-word", name: "One word", style: { wordsPerChunk: 1, size: 110, font: "Bangers", weight: 400, letterSpacing: 2, highlight: "none", popIn: true } },
  { id: "reveal", name: "Word reveal", style: { reveal: true, highlight: "none", popIn: true, wordsPerChunk: 4 } },
  { id: "scale", name: "Scale up", style: { highlight: "scale", activeColor: "#ffffff", popIn: false } },
  { id: "clean", name: "Clean subtitle", style: { uppercase: false, font: "Inter", weight: 600, size: 56, strokeWidth: 0, shadow: 10, highlight: "none", popIn: false, wordsPerChunk: 7, bgColor: "rgba(0,0,0,0.55)", bgPadding: 14, bgRadius: 12 } },
  { id: "underline", name: "Underline", style: { highlight: "underline", activeColor: "#ff2d55", popIn: false, uppercase: false, font: "Poppins", weight: 700 } },
];
export function captionStyle(presetId: string, overrides: Partial<CaptionStyle> = {}): CaptionStyle {
  const p = CAPTION_PRESETS.find(p => p.id === presetId) || CAPTION_PRESETS[0];
  return { ...capBase(), ...p.style, ...overrides, preset: p.id };
}

export const ANIM_TYPES: { id: AnimType; name: string }[] = [
  { id: "none", name: "None" }, { id: "fade", name: "Fade" }, { id: "pop", name: "Pop" },
  { id: "zoomIn", name: "Zoom in" }, { id: "zoomOut", name: "Zoom out" }, { id: "slideUp", name: "Slide up" },
  { id: "slideDown", name: "Slide down" }, { id: "slideLeft", name: "Slide left" }, { id: "slideRight", name: "Slide right" },
  { id: "bounce", name: "Bounce" }, { id: "spin", name: "Spin" }, { id: "blur", name: "Blur" }, { id: "typewriter", name: "Typewriter" },
];
export const LOOP_TYPES: { id: LoopAnimType; name: string }[] = [
  { id: "none", name: "None" }, { id: "pulse", name: "Pulse" }, { id: "wiggle", name: "Wiggle" },
  { id: "float", name: "Float" }, { id: "spin", name: "Spin" }, { id: "shake", name: "Shake" },
];
export const TRANSITIONS: { id: TransitionType; name: string }[] = [
  { id: "none", name: "None" }, { id: "dissolve", name: "Dissolve" }, { id: "fadeBlack", name: "Fade to black" },
  { id: "flash", name: "Flash" }, { id: "whip", name: "Whip pan" }, { id: "zoomIn", name: "Zoom in" },
  { id: "zoomOut", name: "Zoom out" }, { id: "slideLeft", name: "Slide left" }, { id: "slideRight", name: "Slide right" },
  { id: "slideUp", name: "Slide up" }, { id: "slideDown", name: "Slide down" }, { id: "blur", name: "Blur" },
];
export const EFFECTS: { id: EffectType; name: string; hint: string }[] = [
  { id: "punchIn", name: "Punch in", hint: "Snappy zoom on a moment" },
  { id: "zoomPulse", name: "Beat pulse", hint: "Zoom pulses twice a second" },
  { id: "slowZoom", name: "Slow zoom", hint: "Ken Burns push-in" },
  { id: "shake", name: "Shake", hint: "Camera shake" },
  { id: "flash", name: "Flash", hint: "White flash that fades out" },
  { id: "glitch", name: "Glitch", hint: "Slice offsets + jitter" },
  { id: "vignette", name: "Vignette", hint: "Darken the edges" },
  { id: "bw", name: "Black & white", hint: "Desaturate everything" },
  { id: "blurIn", name: "Blur in", hint: "Starts blurred, sharpens" },
  { id: "letterbox", name: "Letterbox", hint: "Cinematic bars" },
];

export const EMOJIS = "😂🤣😭💀🔥😱😳🤯😤😡🥶🥵🤡👀💯❗❓‼️⁉️✅❌⚠️🚨💥💢💸💰🏆👑🎯🎉🙏👏👍👎🫡🤝💪🧠❤️💔🗿🐐🤫🤔😈👻🎮🕹️📈📉⏰🔊".match(/\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*|./gu)!.filter(s => s.trim());

// ── Layouts ─────────────────────────────────────────────────────────────────
export type LayoutId = "fill" | "fit" | "split" | "split5050" | "facecamCorner" | "gameplay";
export const LAYOUTS: { id: LayoutId; name: string; hint: string }[] = [
  { id: "fill", name: "Fill", hint: "Crop the center to fill 9:16" },
  { id: "fit", name: "Fit + blur", hint: "Whole 16:9 frame over a blurred background" },
  { id: "split", name: "Facecam split", hint: "Facecam on top, gameplay below" },
  { id: "split5050", name: "50 / 50", hint: "Facecam and gameplay, equal halves" },
  { id: "facecamCorner", name: "Facecam bubble", hint: "Gameplay full, facecam in a rounded box" },
  { id: "gameplay", name: "Gameplay zoom", hint: "Zoomed on the action, no facecam" },
];
/** Default guess for a streamer facecam: top-left quarter-ish. Clippers adjust it. */
export const DEFAULT_FACE_RECT: Crop = { x: 0.0, y: 0.0, w: 0.28, h: 0.36 };

/**
 * Build the video item(s) for a layout from a template clip (keeps timing/speed/volume).
 * Returns items in bottom → top order; the first carries the audio.
 */
export function layoutItems(
  layout: LayoutId, base: VideoItem, asset: AssetInfo, face: Crop, newId: () => string,
): VideoItem[] {
  const sw = asset.width || 1920, sh = asset.height || 1080;
  const W = CANVAS_W, H = CANVAS_H;
  const mk = (crop: Crop, box: { x: number; y: number; w: number; h: number }, extra: Partial<VideoItem> = {}, first = false): VideoItem => {
    // Adjust the crop so its aspect matches the box (cover), keeping it centered.
    const boxAR = box.w / box.h;
    let c = { ...crop };
    const cropAR = (c.w * sw) / (c.h * sh);
    if (cropAR > boxAR) { const nw = (c.h * sh * boxAR) / sw; c.x += (c.w - nw) / 2; c.w = nw; }
    else { const nh = (c.w * sw) / boxAR / sh; c.y += (c.h - nh) / 2; c.h = nh; }
    c = clampCrop(c);
    const scale = box.w / (c.w * sw);
    return {
      ...base, id: first ? base.id : newId(), crop: c, keyframes: undefined, radius: 0, border: undefined,
      transform: { ...base.transform, x: box.x + box.w / 2, y: box.y + box.h / 2, scale, rotation: 0, opacity: 1 },
      muted: first ? base.muted : true, volume: first ? base.volume : 0, transition: first ? base.transition : undefined,
      ...extra,
    };
  };
  const full = FULL_CROP;
  switch (layout) {
    case "fill":
      return [mk({ x: 0.5 - (sh * 9 / 16 / sw) / 2, y: 0, w: sh * 9 / 16 / sw, h: 1 }, { x: 0, y: 0, w: W, h: H }, {}, true)];
    case "fit": {
      const h = W * sh / sw;
      return [mk(full, { x: 0, y: (H - h) / 2, w: W, h }, {}, true)];
    }
    case "gameplay":
      return [mk({ x: 0.2, y: 0.05, w: 0.6, h: 0.9 }, { x: 0, y: 0, w: W, h: H }, {}, true)];
    case "split": {
      const topH = Math.round(H * 0.36);
      const game = mk({ x: 0.15, y: 0, w: 0.7, h: 1 }, { x: 0, y: topH, w: W, h: H - topH }, {}, true);
      const cam = mk(face, { x: 0, y: 0, w: W, h: topH });
      return [game, cam];
    }
    case "split5050": {
      const half = H / 2;
      const game = mk({ x: 0.2, y: 0, w: 0.6, h: 1 }, { x: 0, y: half, w: W, h: half }, {}, true);
      const cam = mk(face, { x: 0, y: 0, w: W, h: half });
      return [game, cam];
    }
    case "facecamCorner": {
      const game = mk({ x: 0.5 - (sh * 9 / 16 / sw) / 2, y: 0, w: sh * 9 / 16 / sw, h: 1 }, { x: 0, y: 0, w: W, h: H }, {}, true);
      const bw = 420, bh = 420;
      const cam = mk(face, { x: W - bw - 48, y: 140, w: bw, h: bh }, { radius: 48, border: { width: 6, color: "#ffffff" } });
      return [game, cam];
    }
  }
}

export function clampCrop(c: Crop): Crop {
  const w = Math.min(1, Math.max(0.02, c.w)), h = Math.min(1, Math.max(0.02, c.h));
  return { x: Math.min(1 - w, Math.max(0, c.x)), y: Math.min(1 - h, Math.max(0, c.y)), w, h };
}

export function emptyTimeline(): Timeline {
  return {
    version: TIMELINE_VERSION,
    canvas: { width: CANVAS_W, height: CANVAS_H, fps: 30, background: { type: "blur", amount: 40, dim: 0.35 } },
    tracks: [
      { id: "t-video", kind: "video", name: "Main", items: [] },
      { id: "t-overlay", kind: "overlay", name: "Overlay", items: [] },
      { id: "t-text", kind: "text", name: "Text", items: [] },
      { id: "t-caption", kind: "caption", name: "Captions", items: [] },
      { id: "t-audio", kind: "audio", name: "Music", items: [] },
    ],
    faceRects: {},
  };
}
