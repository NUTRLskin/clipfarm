/** Smoke test: render a feature-heavy timeline from a local file. `npx tsx scripts/render-test.ts <src.mp4> <music.m4a> <out.mp4>` */
import os from "os"; import fs from "fs"; import path from "path";
import { renderTimeline } from "../worker/render";
import { emptyTimeline, layoutItems, defaultFilter, defaultTransform, defaultTextStyle, captionStyle, applyFilterPreset, DEFAULT_FACE_RECT, FULL_CROP } from "../lib/editor/presets";
import { newId, buildCaptions } from "../lib/editor/timeline";
import type { AssetInfo, VideoItem } from "../lib/editor/types";

const [src, music, out] = process.argv.slice(2);
const info: Record<string, AssetInfo> = {
  s: { id: "s", kind: "vod", width: 1920, height: 1080, duration: 20, hasAudio: true },
  m: { id: "m", kind: "audio", width: null, height: null, duration: 20, hasAudio: true },
};
const tl = emptyTimeline();
const base: VideoItem = { id: "v1", type: "video", assetId: "s", start: 0, duration: 4, in: 0, speed: 1, volume: 1, fadeIn: 0, fadeOut: 0,
  crop: FULL_CROP, filter: defaultFilter(), transform: defaultTransform() };
const [game, cam] = layoutItems("split", base, info.s, DEFAULT_FACE_RECT, () => newId());
const v2: VideoItem = { ...layoutItems("fit", { ...base, id: "v2", start: 4, in: 8, speed: 2, duration: 3, filter: applyFilterPreset("bw"), transition: { type: "whip", duration: 0.5 } }, info.s, DEFAULT_FACE_RECT, newId)[0] };
tl.tracks[0].items = [game, v2];
tl.tracks[1].items = [{ ...cam, duration: 4 }];
tl.tracks[2].items = [{ id: "tx", type: "text", start: 0.2, duration: 6, text: "WAIT FOR IT 😱", style: { ...defaultTextStyle(), size: 90 }, transform: defaultTransform(540, 300),
  animIn: { type: "pop", duration: 0.4 }, keyframes: { rotation: [{ t: 0, v: -6 }, { t: 3, v: 6 }] } },
  { id: "st", type: "sticker", emoji: "🔥", size: 160, start: 1, duration: 5, transform: defaultTransform(880, 1500), animLoop: { type: "wiggle", speed: 1 } }] as any;
const words = "no way he actually did that bro this is insane".split(" ").map((w, k) => ({ text: w, start: 0.3 + k * 0.45, end: 0.3 + k * 0.45 + 0.4 }));
tl.tracks[3].items = buildCaptions([game], { s: words }, captionStyle("bold"), { transform: defaultTransform(540, 1350) });
tl.tracks.splice(4, 0, { id: "fx", kind: "effect", name: "FX", items: [{ id: "f1", type: "effect", effect: "punchIn", intensity: 1, start: 2, duration: 1 }, { id: "f2", type: "effect", effect: "flash", intensity: 1, start: 4, duration: 0.4 }] });
tl.tracks[5].items = [{ id: "a1", type: "audio", assetId: "m", start: 0, duration: 7, in: 0, speed: 1, volume: 0.3, fadeIn: 1, fadeOut: 1 }];
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rt-"));
const t0 = Date.now();
renderTimeline(tl, info, { s: src, m: music }, dir, out, p => process.stdout.write(`\r${(p * 100).toFixed(0)}%   `))
  .then(r => console.log("\ndone", r, ((Date.now() - t0) / 1000).toFixed(1) + "s"))
  .catch(e => { console.error(e); process.exit(1); });
