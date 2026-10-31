"use client";
import { notFound, useParams } from "next/navigation";
import { Head } from "@/components/admin/AdminKit";

/** Sections from the admin spec that need Stripe, Sentry or inbound email first. Permission-gated by the shell like every other section. */
const LATER: Record<string, { title: string; what: string; needs: string }> = {
  alerts: { title: "Alerts", what: "One feed for everything that needs a person: failed payouts, money mismatches, chargebacks, fraud flags, error spikes, worker down.", needs: "Arrives with Stripe and error tracking (phases 2 and 4)." },
  payouts: { title: "Payouts", what: "Preview the Friday batch before it runs, approve it, retry failed payouts, and the payout kill switch.", needs: "Arrives with Stripe Connect (phase 2). Built and tested in Stripe test mode first." },
  fraud: { title: "Fraud queue", what: "Flagged clips sorted by money at risk. Approve, hold or reverse with a reason.", needs: "Arrives once view snapshots are running (phase 6)." },
  disputes: { title: "Disputes", what: "Clipper appeals and streamer fake-view claims, both sides' evidence, a decision and a 5-business-day timer.", needs: "Arrives in phase 6." },
  support: { title: "Support inbox", what: "Send and receive support email inside the admin, with the person's account and clips beside the message.", needs: "Arrives with Resend and an inbound email service (phase 5)." },
  health: { title: "Errors & health", what: "Database, worker, render queue, TikTok and Twitch status, last view sync, and the newest errors. Green, yellow or red.", needs: "Arrives with Sentry and an uptime monitor (phase 4)." },
};

export default function LaterSection() {
  const { section } = useParams<{ section: string }>();
  const s = LATER[section];
  if (!s) notFound();
  return (
    <>
      <Head title={s.title} />
      <div className="ad-empty" style={{ textAlign: "left", padding: 28 }}>
        <b>Not built yet</b>
        <p style={{ marginLeft: 0 }}>{s.what}</p>
        <p style={{ marginLeft: 0, color: "var(--text-3)" }}>{s.needs}</p>
      </div>
    </>
  );
}
