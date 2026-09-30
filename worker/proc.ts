import { spawn } from "child_process";

export class ProcError extends Error {}

/** Run a command, collect stderr tail, optional line callback (stderr+stdout). */
export function run(cmd: string, args: string[], opts: { onLine?: (l: string) => void; cwd?: string; stdoutBuffer?: boolean } = {}): Promise<{ stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] });
    const out: Buffer[] = [];
    let err = "";
    let partial = "";
    const onText = (d: Buffer) => {
      const s = d.toString();
      err = (err + s).slice(-8000);
      if (opts.onLine) {
        partial += s;
        const lines = partial.split(/[\r\n]/);
        partial = lines.pop() || "";
        lines.forEach(l => l && opts.onLine!(l));
      }
    };
    p.stdout.on("data", d => { if (opts.stdoutBuffer) out.push(d); else onText(d); });
    p.stderr.on("data", onText);
    p.on("error", reject);
    p.on("close", code => {
      if (code === 0) resolve({ stdout: Buffer.concat(out), stderr: err });
      else reject(new ProcError(`${cmd} exited ${code}: ${err.split("\n").slice(-6).join("\n")}`));
    });
  });
}

export type Probe = { duration: number; width: number | null; height: number | null; fps: number | null; hasAudio: boolean; hasVideo: boolean };

export async function ffprobe(file: string): Promise<Probe> {
  const { stdout } = await run("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], { stdoutBuffer: true });
  const j = JSON.parse(stdout.toString());
  const v = j.streams.find((s: any) => s.codec_type === "video" && s.disposition?.attached_pic !== 1);
  const a = j.streams.find((s: any) => s.codec_type === "audio");
  let fps: number | null = null;
  if (v?.avg_frame_rate && v.avg_frame_rate !== "0/0") { const [n, d] = v.avg_frame_rate.split("/").map(Number); fps = d ? n / d : n; }
  let width = v?.width ?? null, height = v?.height ?? null;
  const rot = Number(v?.tags?.rotate || v?.side_data_list?.find((s: any) => s.rotation != null)?.rotation || 0);
  if (Math.abs(rot) === 90 && width && height) [width, height] = [height, width];
  return { duration: Number(j.format.duration || v?.duration || a?.duration || 0), width, height, fps, hasAudio: !!a, hasVideo: !!v };
}

/** Parse ffmpeg "time=HH:MM:SS.xx" progress lines. */
export function ffTime(line: string): number | null {
  const m = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(line);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
}
