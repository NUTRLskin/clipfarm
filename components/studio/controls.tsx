"use client";
import React from "react";

export function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="st-row">
      <div className="st-row-label">{label}{hint && <span className="st-hint">{hint}</span>}</div>
      <div className="st-row-ctl">{children}</div>
    </div>
  );
}

export function Slider({ value, min, max, step = 0.01, onChange, format, onCommit }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string; onCommit?: () => void;
}) {
  return (
    <div className="st-slider">
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} onPointerUp={onCommit} />
      <span className="st-slider-val">{format ? format(value) : (Math.round(value * 100) / 100).toString()}</span>
    </div>
  );
}

export function Num({ value, onChange, step = 1, min, max, suffix }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  return (
    <div className="st-num">
      <input type="number" value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0} step={step} min={min} max={max}
        onChange={e => { const v = Number(e.target.value); if (Number.isFinite(v)) onChange(min != null && v < min ? min : max != null && v > max ? max : v); }} />
      {suffix && <span>{suffix}</span>}
    </div>
  );
}

export function Color({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff";
  return (
    <div className="st-color">
      <input type="color" value={hex} onChange={e => onChange(e.target.value)} />
      <input type="text" value={value} onChange={e => onChange(e.target.value)} spellCheck={false} />
    </div>
  );
}

export function Select<T extends string>({ value, options, onChange }: { value: T; options: { id: T; name: string }[]; onChange: (v: T) => void }) {
  return (
    <select className="st-select" value={value} onChange={e => onChange(e.target.value as T)}>
      {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { id: T; name: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="st-seg">
      {options.map(o => <button key={o.id} className={o.id === value ? "on" : ""} onClick={() => onChange(o.id)}>{o.name}</button>)}
    </div>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="st-toggle">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
      <span className="st-toggle-track"><span className="st-toggle-knob" /></span>
      {label && <span>{label}</span>}
    </label>
  );
}

export function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="st-section">
      <div className="st-section-title"><span>{title}</span>{right}</div>
      {children}
    </div>
  );
}

export function IconBtn({ children, onClick, title, active, disabled, danger }: { children: React.ReactNode; onClick?: () => void; title?: string; active?: boolean; disabled?: boolean; danger?: boolean }) {
  return <button className={`st-icon ${active ? "on" : ""} ${danger ? "danger" : ""}`} onClick={onClick} title={title} disabled={disabled}>{children}</button>;
}

export function Spinner({ size = 14 }: { size?: number }) {
  return <span className="st-spin" style={{ width: size, height: size }} />;
}
