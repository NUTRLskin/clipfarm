import fs from "fs";
import path from "path";
import { GlobalFonts } from "@napi-rs/canvas";
import { FONTS, EMOJI_FONT } from "../lib/editor/presets";

let done = false;
export function registerFonts() {
  if (done) return; done = true;
  const dir = path.resolve("public/fonts");
  for (const f of FONTS) for (const file of Object.values(f.files)) GlobalFonts.registerFromPath(path.join(dir, file), f.family);
  const emoji = [process.env.EMOJI_FONT_PATH, "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", path.join(dir, "NotoColorEmoji.ttf")]
    .find(p => p && fs.existsSync(p));
  if (emoji) GlobalFonts.registerFromPath(emoji, EMOJI_FONT);
  else console.warn("[fonts] Noto Color Emoji not found — emoji stickers will render blank");
}
