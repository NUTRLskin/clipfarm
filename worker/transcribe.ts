import fs from "fs";
import path from "path";
import { ffprobe, run } from "./proc";
import { fetchOriginal, getAsset, updateAsset } from "./media";

type Word = { text: string; start: number; end: number };
const CHUNK = 600; // seconds per Whisper request (keeps uploads well under 25MB)

async function whisper(file: string, offset: number): Promise<Word[]> {
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(file)], { type: "audio/mpeg" }), path.basename(file));
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.append("timestamp_granularities[]", "segment");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form,
  });
  if (!res.ok) throw new Error(`Whisper ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j: any = await res.json();
  const words: Word[] = (j.words || []).map((w: any) => ({ text: String(w.word).trim(), start: w.start + offset, end: w.end + offset }));
  // Whisper word tokens drop punctuation; re-attach it from the segment text so captions can break on sentences.
  const text: string = j.text || "";
  let cursor = 0;
  for (const w of words) {
    const idx = text.indexOf(w.text, cursor);
    if (idx < 0) continue;
    cursor = idx + w.text.length;
    const m = /^[.,!?;:…]+/.exec(text.slice(cursor));
    if (m) { w.text += m[0]; cursor += m[0].length; }
  }
  return words.filter(w => w.text);
}

/** Job: word-level transcript for an asset (stored on asset.meta.transcript, source time). */
export async function transcribeJob(payload: { assetId: string }, dir: string, onProgress: (p: number) => void) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured on the worker");
  const a = await getAsset(payload.assetId);
  if (!a.hasAudio) throw new Error("This clip has no audio");
  const file = await fetchOriginal(a, dir);
  const { duration } = await ffprobe(file);
  const words: Word[] = [];
  const n = Math.max(1, Math.ceil(duration / CHUNK));
  for (let k = 0; k < n; k++) {
    const part = path.join(dir, `part${k}.mp3`);
    await run("ffmpeg", ["-y", "-ss", String(k * CHUNK), "-t", String(CHUNK), "-i", file, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", part]);
    words.push(...await whisper(part, k * CHUNK));
    onProgress((k + 1) / n);
  }
  const fresh = await getAsset(a.id);
  await updateAsset(a.id, { meta: { ...(fresh.meta as any), transcript: words } });
  return { assetId: a.id, words: words.length };
}
