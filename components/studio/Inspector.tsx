"use client";
/** Right-hand properties panel for the selected item. */
import { useEditor, useSelected } from "@/lib/editor/store";
import { hasKeyframeAt, interpolate, newId } from "@/lib/editor/timeline";
import { ANIM_TYPES, LOOP_TYPES, TRANSITIONS, EFFECTS, FILTER_PRESETS, FONTS, fontWeights, CAPTION_PRESETS, TEXT_PRESETS, applyFilterPreset, captionStyle, defaultTextStyle, LAYOUTS, DEFAULT_FACE_RECT, layoutItems, EMOJIS } from "@/lib/editor/presets";
import type { AnimatableProp, CaptionStyle, Item, TextStyle, VideoItem, VisualItem, ImageItem, Filter } from "@/lib/editor/types";
import { Row, Slider, Num, Color, Select, Seg, Toggle, Section } from "./controls";

const BLENDS = ["normal", "screen", "multiply", "overlay", "lighten", "darken", "difference", "hard-light", "soft-light"].map(b => ({ id: b, name: b }));

export default function Inspector() {
  const sel = useSelected();
  const time = useEditor(s => s.time);
  const tl = useEditor(s => s.timeline);
  const assets = useEditor(s => s.assets);
  const { updateItem, toggleKeyframe, commit, setFaceRectEditing } = useEditor.getState();
  if (!sel) return <CanvasInspector />;
  const item = sel.item;
  const up = (patch: Partial<Item>, merge = true) => updateItem(item.id, patch as any, merge);
  const vis = item.type !== "effect" && item.type !== "audio" ? (item as VisualItem) : null;

  const tfRow = (prop: AnimatableProp, label: string, ctl: React.ReactNode) => {
    const kf = vis && hasKeyframeAt(vis, prop, time);
    const has = vis?.keyframes?.[prop]?.length;
    return (
      <Row label={label}>
        {ctl}
        <button className={`st-kf ${kf ? "on" : has ? "some" : ""}`} title={kf ? "Remove keyframe here" : "Add keyframe at playhead"} onClick={() => toggleKeyframe(item.id, prop)}>◆</button>
      </Row>
    );
  };
  const setTf = (prop: AnimatableProp, v: number) => {
    if (!vis) return;
    if (vis.keyframes?.[prop]?.length) {
      const rel = time - vis.start;
      const list = [...vis.keyframes[prop]!].filter(k => Math.abs(k.t - rel) > 1 / 60);
      list.push({ t: rel, v, ease: "easeInOut" }); list.sort((a, b) => a.t - b.t);
      up({ keyframes: { ...vis.keyframes, [prop]: list } } as any);
    } else up({ transform: { ...vis.transform, [prop]: v } } as any);
  };
  const tfVal = (prop: AnimatableProp) => {
    if (!vis) return 0;
    const list = vis.keyframes?.[prop];
    if (list?.length) return interpolate(list, time - vis.start, vis.transform[prop]);
    return vis.transform[prop];
  };

  return (
    <div className="st-inspector">
      <div className="st-insp-title">{TITLES[item.type]}<span className="st-hint">{item.duration.toFixed(2)}s</span></div>

      {item.type === "video" && <VideoProps item={item} up={up} />}

      {(item.type === "text") && <TextProps style={item.style} text={item.text} onText={t => up({ text: t } as any)} onStyle={(s, m) => up({ style: { ...item.style, ...s } } as any, m)} />}
      {item.type === "caption" && <CaptionProps item={item} up={up} />}
      {item.type === "sticker" && (
        <Section title="Sticker">
          {item.emoji != null && (
            <div className="st-emoji-grid small">{EMOJIS.map(e => <button key={e} className={e === item.emoji ? "on" : ""} onClick={() => up({ emoji: e } as any, false)}>{e}</button>)}</div>
          )}
          <Row label="Size"><Slider value={item.size} min={40} max={800} step={1} onChange={v => up({ size: v } as any)} format={v => `${Math.round(v)}px`} /></Row>
        </Section>
      )}
      {item.type === "image" && <FilterProps filter={item.filter} onChange={(f, m) => up({ filter: f } as any, m)} />}
      {item.type === "effect" && (
        <Section title="Effect">
          <Row label="Type"><Select value={item.effect} options={EFFECTS} onChange={v => up({ effect: v } as any, false)} /></Row>
          <div className="st-hint" style={{ marginBottom: 8 }}>{EFFECTS.find(e => e.id === item.effect)?.hint}</div>
          <Row label="Intensity"><Slider value={item.intensity} min={0} max={2} onChange={v => up({ intensity: v } as any)} /></Row>
        </Section>
      )}
      {item.type === "audio" && (
        <Section title="Audio">
          <Row label="Volume"><Slider value={item.volume} min={0} max={2} onChange={v => up({ volume: v } as any)} format={v => `${Math.round(v * 100)}%`} /></Row>
          <Row label="Speed"><Slider value={item.speed} min={0.25} max={4} step={0.05} onChange={v => up({ speed: v, duration: item.duration * item.speed / v } as any)} format={v => `${v.toFixed(2)}×`} /></Row>
          <Row label="Fade in"><Slider value={item.fadeIn} min={0} max={5} step={0.1} onChange={v => up({ fadeIn: v } as any)} format={v => `${v.toFixed(1)}s`} /></Row>
          <Row label="Fade out"><Slider value={item.fadeOut} min={0} max={5} step={0.1} onChange={v => up({ fadeOut: v } as any)} format={v => `${v.toFixed(1)}s`} /></Row>
          <Row label="Auto-duck"><Toggle value={!!item.duck} onChange={v => up({ duck: v } as any, false)} label="Drop under speech" /></Row>
          {item.duck && <div className="st-hint">Music dips whenever someone talks in the video clips (applied on export).</div>}
        </Section>
      )}

      {vis && (
        <Section title="Transform" right={<span className="st-hint">◆ = keyframe</span>}>
          {tfRow("x", "X", <Num value={tfVal("x")} onChange={v => setTf("x", v)} />)}
          {tfRow("y", "Y", <Num value={tfVal("y")} onChange={v => setTf("y", v)} />)}
          {tfRow("scale", "Scale", <Slider value={tfVal("scale")} min={0.05} max={5} onChange={v => setTf("scale", v)} format={v => `${Math.round(v * 100)}%`} />)}
          {tfRow("rotation", "Rotate", <Slider value={tfVal("rotation")} min={-180} max={180} step={1} onChange={v => setTf("rotation", v)} format={v => `${Math.round(v)}°`} />)}
          {tfRow("opacity", "Opacity", <Slider value={tfVal("opacity")} min={0} max={1} onChange={v => setTf("opacity", v)} format={v => `${Math.round(v * 100)}%`} />)}
          {vis.keyframes && Object.keys(vis.keyframes).length > 0 && (
            <button className="st-link" onClick={() => up({ keyframes: undefined } as any, false)}>Clear all keyframes</button>
          )}
          <div className="st-btn-row">
            <button className="st-btn" onClick={() => setTf("x", tl.canvas.width / 2)}>Center X</button>
            <button className="st-btn" onClick={() => setTf("y", tl.canvas.height / 2)}>Center Y</button>
            {(item.type === "video" || item.type === "image") && <button className="st-btn" onClick={() => {
              const a = assets[(item as VideoItem).assetId]; if (!a?.width || !a.height) return;
              const cw = (item as VideoItem).crop.w * a.width, ch = (item as VideoItem).crop.h * a.height;
              setTf("scale", Math.max(tl.canvas.width / cw, tl.canvas.height / ch));
            }}>Fill</button>}
          </div>
          <Row label="Blend"><Select value={vis.blend || "normal"} options={BLENDS} onChange={v => up({ blend: v } as any, false)} /></Row>
        </Section>
      )}

      {vis && (
        <Section title="Animation">
          <Row label="In"><Select value={vis.animIn?.type || "none"} options={ANIM_TYPES} onChange={v => up({ animIn: { type: v, duration: vis.animIn?.duration || 0.4 } } as any, false)} /></Row>
          {vis.animIn && vis.animIn.type !== "none" && <Row label="In length"><Slider value={vis.animIn.duration} min={0.1} max={3} step={0.05} onChange={v => up({ animIn: { ...vis.animIn!, duration: v } } as any)} format={v => `${v.toFixed(2)}s`} /></Row>}
          <Row label="Out"><Select value={vis.animOut?.type || "none"} options={ANIM_TYPES.filter(a => a.id !== "typewriter")} onChange={v => up({ animOut: { type: v, duration: vis.animOut?.duration || 0.4 } } as any, false)} /></Row>
          {vis.animOut && vis.animOut.type !== "none" && <Row label="Out length"><Slider value={vis.animOut.duration} min={0.1} max={3} step={0.05} onChange={v => up({ animOut: { ...vis.animOut!, duration: v } } as any)} format={v => `${v.toFixed(2)}s`} /></Row>}
          <Row label="Loop"><Select value={vis.animLoop?.type || "none"} options={LOOP_TYPES} onChange={v => up({ animLoop: { type: v, speed: vis.animLoop?.speed || 1 } } as any, false)} /></Row>
          {vis.animLoop && vis.animLoop.type !== "none" && <Row label="Loop speed"><Slider value={vis.animLoop.speed} min={0.2} max={4} step={0.1} onChange={v => up({ animLoop: { ...vis.animLoop!, speed: v } } as any)} format={v => `${v.toFixed(1)}×`} /></Row>}
        </Section>
      )}

      <Section title="Timing">
        <Row label="Start"><Num value={item.start} step={0.1} min={0} onChange={v => useEditor.getState().moveItem(item.id, v)} suffix="s" /></Row>
        <Row label="Length"><Num value={item.duration} step={0.1} min={0.1} onChange={v => up({ duration: Math.max(0.1, v) } as any)} suffix="s" /></Row>
      </Section>
      {item.type === "video" && sel.track.kind === "video" && (
        <Section title="Layout">
          <div className="st-hint" style={{ marginBottom: 8 }}>Re-frame this clip for 9:16. Facecam layouts use the box you mark on the source.</div>
          <div className="st-grid2">
            {LAYOUTS.map(L => <button key={L.id} className="st-tile" onClick={() => {
              const a = assets[item.assetId]; if (!a) return;
              const face = tl.faceRects?.[item.assetId] || DEFAULT_FACE_RECT;
              const items = layoutItems(L.id, item, { id: a.id, kind: a.kind, width: a.width, height: a.height, duration: a.duration, hasAudio: a.hasAudio }, face, () => newId("v"));
              commit(t => {
                // Replace this clip and any overlay clips that were generated from it (same asset, same timing).
                for (const tr of t.tracks) tr.items = tr.items.filter(i => !(i.type === "video" && i.id !== item.id && i.assetId === item.assetId && Math.abs(i.start - item.start) < 0.01 && Math.abs(i.duration - item.duration) < 0.01 && tr.kind === "overlay"));
                const main = t.tracks.find(tr => tr.id === sel.track.id)!;
                main.items = main.items.map(i => i.id === item.id ? items[0] : i);
                if (items[1]) {
                  let ov = t.tracks.find(tr => tr.kind === "overlay" && !tr.items.some(o => items[1].start < o.start + o.duration && items[1].start + items[1].duration > o.start));
                  if (!ov) { ov = { id: newId("t"), kind: "overlay", name: "Facecam", items: [] }; t.tracks.splice(t.tracks.indexOf(main) + 1, 0, ov); }
                  ov.items.push(items[1]);
                }
              });
              if (L.id === "split" || L.id === "split5050" || L.id === "facecamCorner") { if (!tl.faceRects?.[item.assetId]) setFaceRectEditing(item.id); }
            }}><b>{L.name}</b><span>{L.hint}</span></button>)}
          </div>
          <button className="st-btn" style={{ marginTop: 8 }} onClick={() => setFaceRectEditing(item.id)}>Mark facecam area…</button>
        </Section>
      )}
    </div>
  );
}

const TITLES: Record<string, string> = { video: "Video clip", image: "Image", text: "Text", caption: "Caption", sticker: "Sticker", effect: "Effect", audio: "Audio" };

function VideoProps({ item, up }: { item: VideoItem; up: (p: Partial<VideoItem>, merge?: boolean) => void }) {
  const tl = useEditor(s => s.timeline);
  const track = tl.tracks.find(t => t.items.some(i => i.id === item.id));
  const hasPrev = track ? track.items.some(o => o.id !== item.id && Math.abs(o.start + o.duration - item.start) < 0.05) : false;
  return (
    <>
      <Section title="Clip">
        <Row label="Speed"><Slider value={item.speed} min={0.25} max={4} step={0.05} onChange={v => up({ speed: v, duration: item.duration * item.speed / v })} format={v => `${v.toFixed(2)}×`} /></Row>
        <div className="st-btn-row">{[0.5, 1, 1.5, 2].map(s => <button key={s} className={`st-btn ${item.speed === s ? "on" : ""}`} onClick={() => up({ speed: s, duration: item.duration * item.speed / s }, false)}>{s}×</button>)}</div>
        <Row label="Volume"><Slider value={item.volume} min={0} max={2} onChange={v => up({ volume: v })} format={v => `${Math.round(v * 100)}%`} /></Row>
        <Row label="Muted"><Toggle value={!!item.muted} onChange={v => up({ muted: v }, false)} /></Row>
        <Row label="Fade in"><Slider value={item.fadeIn} min={0} max={3} step={0.1} onChange={v => up({ fadeIn: v })} format={v => `${v.toFixed(1)}s`} /></Row>
        <Row label="Fade out"><Slider value={item.fadeOut} min={0} max={3} step={0.1} onChange={v => up({ fadeOut: v })} format={v => `${v.toFixed(1)}s`} /></Row>
        <Row label="Flip"><Toggle value={!!item.flipH} onChange={v => up({ flipH: v }, false)} label="Mirror horizontally" /></Row>
        <Row label="Corners"><Slider value={item.radius || 0} min={0} max={200} step={1} onChange={v => up({ radius: v })} format={v => `${Math.round(v)}px`} /></Row>
        <Row label="Border"><Slider value={item.border?.width || 0} min={0} max={30} step={1} onChange={v => up({ border: { width: v, color: item.border?.color || "#ffffff" } })} format={v => `${Math.round(v)}px`} /></Row>
        {item.border && item.border.width > 0 && <Row label="Border color"><Color value={item.border.color} onChange={c => up({ border: { ...item.border!, color: c } })} /></Row>}
      </Section>
      <Section title="Crop" right={<span className="st-hint">of source</span>}>
        <Row label="Left"><Slider value={item.crop.x} min={0} max={1 - item.crop.w} onChange={v => up({ crop: { ...item.crop, x: v } })} format={v => `${Math.round(v * 100)}%`} /></Row>
        <Row label="Top"><Slider value={item.crop.y} min={0} max={1 - item.crop.h} onChange={v => up({ crop: { ...item.crop, y: v } })} format={v => `${Math.round(v * 100)}%`} /></Row>
        <Row label="Width"><Slider value={item.crop.w} min={0.05} max={1 - item.crop.x} onChange={v => up({ crop: { ...item.crop, w: v } })} format={v => `${Math.round(v * 100)}%`} /></Row>
        <Row label="Height"><Slider value={item.crop.h} min={0.05} max={1 - item.crop.y} onChange={v => up({ crop: { ...item.crop, h: v } })} format={v => `${Math.round(v * 100)}%`} /></Row>
        <button className="st-link" onClick={() => up({ crop: { x: 0, y: 0, w: 1, h: 1 } }, false)}>Reset crop</button>
      </Section>
      <Section title="Transition" right={<span className="st-hint">from previous clip</span>}>
        {hasPrev ? (
          <>
            <Row label="Type"><Select value={item.transition?.type || "none"} options={TRANSITIONS} onChange={v => up({ transition: { type: v, duration: item.transition?.duration || 0.5 } }, false)} /></Row>
            {item.transition && item.transition.type !== "none" && <Row label="Length"><Slider value={item.transition.duration} min={0.1} max={2} step={0.05} onChange={v => up({ transition: { ...item.transition!, duration: v } })} format={v => `${v.toFixed(2)}s`} /></Row>}
          </>
        ) : <div className="st-hint">Place this clip right after another one to add a transition.</div>}
      </Section>
      <FilterProps filter={item.filter} onChange={(f, m) => up({ filter: f }, m)} />
    </>
  );
}

export function FilterProps({ filter, onChange }: { filter: Filter; onChange: (f: Filter, merge?: boolean) => void }) {
  const set = (p: Partial<Filter>) => onChange({ ...filter, ...p, preset: undefined });
  return (
    <Section title="Filters">
      <div className="st-chips">{FILTER_PRESETS.map(p => <button key={p.id} className={filter.preset === p.id || (!filter.preset && p.id === "none") ? "on" : ""} onClick={() => onChange(applyFilterPreset(p.id), false)}>{p.name}</button>)}</div>
      <Row label="Brightness"><Slider value={filter.brightness} min={0.3} max={2} onChange={v => set({ brightness: v })} /></Row>
      <Row label="Contrast"><Slider value={filter.contrast} min={0.3} max={2} onChange={v => set({ contrast: v })} /></Row>
      <Row label="Saturation"><Slider value={filter.saturation} min={0} max={3} onChange={v => set({ saturation: v })} /></Row>
      <Row label="Hue"><Slider value={filter.hue} min={-180} max={180} step={1} onChange={v => set({ hue: v })} format={v => `${Math.round(v)}°`} /></Row>
      <Row label="Blur"><Slider value={filter.blur} min={0} max={40} step={0.5} onChange={v => set({ blur: v })} format={v => `${v}px`} /></Row>
      <Row label="Sepia"><Slider value={filter.sepia} min={0} max={1} onChange={v => set({ sepia: v })} /></Row>
      <Row label="Grayscale"><Slider value={filter.grayscale} min={0} max={1} onChange={v => set({ grayscale: v })} /></Row>
    </Section>
  );
}

export function TextProps({ style, text, onText, onStyle }: { style: TextStyle; text: string; onText: (t: string) => void; onStyle: (s: Partial<TextStyle>, merge?: boolean) => void }) {
  const weights = fontWeights(style.font);
  return (
    <>
      <Section title="Text">
        <textarea className="st-textarea" value={text} onChange={e => onText(e.target.value)} rows={3} />
        <div className="st-chips">{TEXT_PRESETS.map(p => <button key={p.id} onClick={() => onStyle({ ...defaultTextStyle(), ...p.style }, false)}>{p.name}</button>)}</div>
      </Section>
      <StyleProps style={style} onStyle={onStyle} weights={weights} />
    </>
  );
}

function StyleProps({ style, onStyle, weights }: { style: TextStyle; onStyle: (s: Partial<TextStyle>, merge?: boolean) => void; weights: number[] }) {
  return (
    <Section title="Style">
      <Row label="Font"><Select value={style.font} options={FONTS.map(f => ({ id: f.family, name: f.family }))} onChange={v => onStyle({ font: v, weight: fontWeights(v).includes(style.weight) ? style.weight : fontWeights(v)[fontWeights(v).length - 1] }, false)} /></Row>
      <Row label="Weight"><Seg value={String(style.weight) as any} options={weights.map(w => ({ id: String(w) as any, name: String(w) }))} onChange={v => onStyle({ weight: Number(v) }, false)} /></Row>
      <Row label="Size"><Slider value={style.size} min={20} max={220} step={1} onChange={v => onStyle({ size: v })} format={v => `${Math.round(v)}`} /></Row>
      <Row label="Color"><Color value={style.color} onChange={v => onStyle({ color: v })} /></Row>
      <Row label="Outline"><Slider value={style.strokeWidth} min={0} max={24} step={1} onChange={v => onStyle({ strokeWidth: v })} /></Row>
      {style.strokeWidth > 0 && <Row label="Outline color"><Color value={style.strokeColor} onChange={v => onStyle({ strokeColor: v })} /></Row>}
      <Row label="Shadow"><Slider value={style.shadow} min={0} max={40} step={1} onChange={v => onStyle({ shadow: v })} /></Row>
      <Row label="Background"><Toggle value={!!style.bgColor} onChange={v => onStyle({ bgColor: v ? "rgba(0,0,0,0.7)" : undefined }, false)} /></Row>
      {style.bgColor && <>
        <Row label="BG color"><Color value={style.bgColor} onChange={v => onStyle({ bgColor: v })} /></Row>
        <Row label="Padding"><Slider value={style.bgPadding} min={0} max={60} step={1} onChange={v => onStyle({ bgPadding: v })} /></Row>
        <Row label="Radius"><Slider value={style.bgRadius} min={0} max={60} step={1} onChange={v => onStyle({ bgRadius: v })} /></Row>
      </>}
      <Row label="Align"><Seg value={style.align} options={[{ id: "left", name: "Left" }, { id: "center", name: "Center" }, { id: "right", name: "Right" }]} onChange={v => onStyle({ align: v }, false)} /></Row>
      <Row label="Caps"><Toggle value={style.uppercase} onChange={v => onStyle({ uppercase: v }, false)} /></Row>
      <Row label="Italic"><Toggle value={style.italic} onChange={v => onStyle({ italic: v }, false)} /></Row>
      <Row label="Spacing"><Slider value={style.letterSpacing} min={-5} max={30} step={0.5} onChange={v => onStyle({ letterSpacing: v })} /></Row>
      <Row label="Line height"><Slider value={style.lineHeight} min={0.8} max={2} step={0.05} onChange={v => onStyle({ lineHeight: v })} /></Row>
      <Row label="Wrap width"><Slider value={style.maxWidth} min={200} max={1080} step={10} onChange={v => onStyle({ maxWidth: v })} format={v => `${Math.round(v)}`} /></Row>
    </Section>
  );
}

function CaptionProps({ item, up }: { item: Extract<Item, { type: "caption" }>; up: (p: any, merge?: boolean) => void }) {
  const { commit } = useEditor.getState();
  const s: CaptionStyle = item.style;
  const onStyle = (p: Partial<TextStyle>, merge = true) => up({ style: { ...s, ...p } }, merge);
  const applyAll = (patch: Partial<CaptionStyle>) => commit(t => { for (const tr of t.tracks) for (const i of tr.items) if (i.type === "caption") i.style = { ...i.style, ...patch }; });
  return (
    <>
      <Section title="Caption" right={<button className="st-link" onClick={() => applyAll(s)}>Apply style to all</button>}>
        <div className="st-words">
          {item.words.map((w, k) => <input key={k} value={w.text} onChange={e => up({ words: item.words.map((x, j) => j === k ? { ...x, text: e.target.value } : x) })} style={{ width: Math.max(40, w.text.length * 10 + 20) }} />)}
        </div>
        <div className="st-chips">{CAPTION_PRESETS.map(p => <button key={p.id} className={s.preset === p.id ? "on" : ""} onClick={() => applyAll(captionStyle(p.id, { maxWidth: s.maxWidth }))}>{p.name}</button>)}</div>
        <Row label="Highlight"><Seg value={s.highlight} options={[{ id: "color", name: "Color" }, { id: "box", name: "Box" }, { id: "scale", name: "Scale" }, { id: "underline", name: "Line" }, { id: "none", name: "Off" }]} onChange={v => applyAll({ highlight: v })} /></Row>
        {s.highlight !== "none" && <Row label="Active color"><Color value={s.activeColor} onChange={v => applyAll({ activeColor: v })} /></Row>}
        {s.highlight === "box" && <Row label="Box color"><Color value={s.activeBg} onChange={v => applyAll({ activeBg: v })} /></Row>}
        <Row label="Pop in"><Toggle value={s.popIn} onChange={v => applyAll({ popIn: v })} /></Row>
        <Row label="Reveal"><Toggle value={s.reveal} onChange={v => applyAll({ reveal: v })} label="Show words as spoken" /></Row>
      </Section>
      <StyleProps style={s} onStyle={onStyle} weights={fontWeights(s.font)} />
    </>
  );
}

function CanvasInspector() {
  const tl = useEditor(s => s.timeline);
  const { commit } = useEditor.getState();
  const bg = tl.canvas.background;
  return (
    <div className="st-inspector">
      <div className="st-insp-title">Canvas</div>
      <Section title="Background">
        <Seg value={bg.type} options={[{ id: "blur", name: "Blurred video" }, { id: "color", name: "Solid color" }]} onChange={v => commit(t => { t.canvas.background = v === "blur" ? { type: "blur", amount: 40, dim: 0.35 } : { type: "color", color: "#000000" }; })} />
        {bg.type === "blur" && <>
          <Row label="Blur"><Slider value={bg.amount} min={0} max={120} step={1} onChange={v => commit(t => { (t.canvas.background as any).amount = v; }, { merge: true })} /></Row>
          <Row label="Darken"><Slider value={bg.dim} min={0} max={1} onChange={v => commit(t => { (t.canvas.background as any).dim = v; }, { merge: true })} /></Row>
        </>}
        {bg.type === "color" && <Row label="Color"><Color value={bg.color} onChange={v => commit(t => { (t.canvas.background as any).color = v; }, { merge: true })} /></Row>}
      </Section>
      <Section title="Output">
        <Row label="Frame rate"><Seg value={String(tl.canvas.fps) as any} options={[{ id: "24", name: "24" }, { id: "30", name: "30" }, { id: "60", name: "60" }]} onChange={v => commit(t => { t.canvas.fps = Number(v); })} /></Row>
        <div className="st-hint">1080 × 1920 (9:16) for TikTok.</div>
      </Section>
      <div className="st-hint" style={{ marginTop: 16 }}>Select a clip, text or sticker to edit it. Shortcuts: Space play · S split · ⌘Z undo · ⌘D duplicate · Delete remove · ←/→ frame step.</div>
    </div>
  );
}
