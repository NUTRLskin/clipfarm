/** Wordmark: lowercase "clipfarm" with the i's dot replaced by a small purple play triangle (PRD 13.1). */
export default function Logo({ size = 20 }: { size?: number }) {
  return (
    <span aria-label="Clip Farm" style={{ display: "inline-flex", alignItems: "baseline", fontSize: size, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--text)" }}>
      <span aria-hidden>cl</span>
      <span aria-hidden style={{ position: "relative", display: "inline-block" }}>
        {"ı"}
        <svg viewBox="0 0 10 10" width={size * 0.36} height={size * 0.36} style={{ position: "absolute", left: "50%", top: -size * 0.16, transform: "translateX(-42%)" }}>
          <path d="M1.5 0.8 L9.2 5 L1.5 9.2 Z" fill="var(--brand)" />
        </svg>
      </span>
      <span aria-hidden>pfarm</span>
    </span>
  );
}
