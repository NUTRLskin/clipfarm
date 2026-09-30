/**
 * Timeline model shared by the browser editor (preview) and the render worker.
 * All times are in seconds on the timeline unless noted. Positions are canvas
 * pixels (default canvas 1080×1920). Everything here must stay JSON-serialisable.
 */

export const TIMELINE_VERSION = 1;

export type Transform = {
  /** Center of the item, canvas px. */
  x: number;
  y: number;
  /** Multiplier on the item's natural size (for video: cropped source px). */
  scale: number;
  /** Degrees, clockwise. */
  rotation: number;
  /** 0..1 */
  opacity: number;
};
export type AnimatableProp = keyof Transform;

export type Easing = "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold";
/** `t` is seconds from the item's start. */
export type Keyframe = { t: number; v: number; ease?: Easing };
export type Keyframes = Partial<Record<AnimatableProp, Keyframe[]>>;

/** Normalised rect inside the source (0..1). */
export type Crop = { x: number; y: number; w: number; h: number };

export type Filter = {
  preset?: string;
  brightness: number; // 1 = unchanged
  contrast: number;
  saturation: number;
  hue: number; // degrees
  blur: number; // px
  sepia: number; // 0..1
  grayscale: number; // 0..1
};

export type AnimType =
  | "none" | "fade" | "pop" | "zoomIn" | "zoomOut" | "slideUp" | "slideDown" | "slideLeft" | "slideRight"
  | "bounce" | "spin" | "typewriter" | "blur";
export type Anim = { type: AnimType; duration: number };
export type LoopAnimType = "none" | "pulse" | "wiggle" | "float" | "spin" | "shake";

export type TransitionType =
  | "none" | "dissolve" | "fadeBlack" | "flash" | "slideLeft" | "slideRight" | "slideUp" | "slideDown"
  | "zoomIn" | "zoomOut" | "whip" | "blur";
export type Transition = { type: TransitionType; duration: number };

type ItemBase = {
  id: string;
  start: number;
  duration: number;
  /** Optional label shown on the timeline. */
  label?: string;
};

type Visual = ItemBase & {
  transform: Transform;
  keyframes?: Keyframes;
  animIn?: Anim;
  animOut?: Anim;
  animLoop?: { type: LoopAnimType; speed: number };
  /** CSS blend mode name ("normal", "screen", "multiply", …). */
  blend?: string;
};

export type VideoItem = Visual & {
  type: "video";
  assetId: string;
  /** Source time (s) at the item's start. */
  in: number;
  speed: number;
  volume: number; // 0..2
  muted?: boolean;
  fadeIn: number; // audio fade, seconds
  fadeOut: number;
  crop: Crop;
  filter: Filter;
  /** Transition from the previous clip on the same track into this one. */
  transition?: Transition;
  /** Rounded corners (px) — nice for facecam boxes. */
  radius?: number;
  border?: { width: number; color: string };
  flipH?: boolean;
};

export type ImageItem = Visual & {
  type: "image";
  assetId: string;
  crop: Crop;
  filter: Filter;
  radius?: number;
  border?: { width: number; color: string };
};

export type TextStyle = {
  font: string; // family name
  weight: number;
  size: number; // px
  color: string;
  strokeColor: string;
  strokeWidth: number;
  bgColor?: string; // box behind the text
  bgPadding: number;
  bgRadius: number;
  shadow: number; // blur px, 0 = none
  shadowColor: string;
  align: "left" | "center" | "right";
  uppercase: boolean;
  italic: boolean;
  letterSpacing: number;
  lineHeight: number; // multiplier
  maxWidth: number; // wrap width px
};

export type TextItem = Visual & { type: "text"; text: string; style: TextStyle };

export type CaptionWord = { text: string; start: number; end: number }; // relative to item start
export type CaptionHighlight = "color" | "box" | "scale" | "underline" | "none";
export type CaptionStyle = TextStyle & {
  preset: string;
  activeColor: string;
  activeBg: string;
  highlight: CaptionHighlight;
  /** Only show words once spoken (karaoke reveal). */
  reveal: boolean;
  /** Pop each word in as it is spoken. */
  popIn: boolean;
  wordsPerChunk: number;
};
export type CaptionItem = Visual & { type: "caption"; words: CaptionWord[]; style: CaptionStyle };

export type StickerItem = Visual & {
  type: "sticker";
  /** Either an emoji (rendered with the emoji font) or an uploaded image asset. */
  emoji?: string;
  assetId?: string;
  size: number; // px (emoji font size / image width at scale 1)
};

export type EffectType =
  | "punchIn" | "zoomPulse" | "slowZoom" | "shake" | "flash" | "vignette" | "glitch" | "bw" | "blurIn" | "letterbox";
export type EffectItem = ItemBase & { type: "effect"; effect: EffectType; intensity: number };

export type AudioItem = ItemBase & {
  type: "audio";
  assetId: string;
  in: number;
  speed: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  /** Auto-duck: drop under speech from the video tracks (applied on export via sidechain compression). */
  duck?: boolean;
};

export type VisualItem = VideoItem | ImageItem | TextItem | CaptionItem | StickerItem;
export type Item = VisualItem | EffectItem | AudioItem;
export type ItemType = Item["type"];

export type TrackKind = "video" | "overlay" | "text" | "caption" | "effect" | "audio";
export type Track = {
  id: string;
  kind: TrackKind;
  name: string;
  muted?: boolean;
  hidden?: boolean;
  locked?: boolean;
  items: Item[];
};

export type Background =
  | { type: "blur"; amount: number; dim: number }
  | { type: "color"; color: string };

export type Timeline = {
  version: number;
  canvas: { width: number; height: number; fps: number; background: Background };
  /** Bottom → top draw order. */
  tracks: Track[];
  /** Face-cam rectangle per source asset (normalised) — used by split layouts. */
  faceRects?: Record<string, Crop>;
};

/** Minimal asset info the compositor needs. */
export type AssetInfo = {
  id: string;
  kind: "vod" | "video" | "image" | "audio" | "export";
  width: number | null;
  height: number | null;
  duration: number | null;
  hasAudio: boolean;
  name?: string;
};
