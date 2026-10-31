"use client";
import { useState } from "react";
import { Head, Loading, Err, Table, Empty, useAdmin, when } from "@/components/admin/AdminKit";

type Row = { id: string; staffEmail: string | null; action: string; targetType: string | null; targetId: string | null; detail: unknown; ip: string | null; createdAt: string };

const LABEL: Record<string, string> = {
  "staff.setup_owner": "Created the Owner account", "staff.login": "Signed in", "staff.logout": "Signed out", "staff.login_failed": "Wrong password",
  "staff.login_recovery_code": "Signed in with a recovery code", "staff.2fa_enrolled": "Turned on two-step sign-in", "staff.2fa_reset": "Reset two-step sign-in",
  "staff.invited": "Invited staff", "staff.reinvited": "Sent a new invite", "staff.invite_accepted": "Accepted invite", "staff.access_changed": "Changed access",
  "staff.role_created": "Created a role", "staff.role_updated": "Updated a role", "staff.role_deleted": "Deleted a role",
  "user.suspend": "Suspended a user", "user.unsuspend": "Unsuspended a user", "user.signout_everywhere": "Signed a user out", "user.view_personal_data": "Viewed personal data",
  "contract.fund": "Marked a contract paid", "contract.pause": "Paused a contract", "contract.resume": "Resumed a contract", "contract.end": "Ended a contract",
  "settings.rate_changed": "Changed the rate",
};

export default function AdminAudit() {
  const { data, error, loading, reload } = useAdmin<Row[]>("/api/admin/audit");
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <Head title="Audit log" sub="Every staff action, newest first. Nobody can edit or delete these." right={<button className="cf-btn cf-btn--sm" onClick={reload}>Refresh</button>} />
      {error && <Err msg={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : data && (
        <Table cols={["When", "Who", "What", "On", "Details"]} empty={<Empty title="Nothing logged yet" />}
          rows={data.map(r => [
            <span className="ad-muted">{when(r.createdAt)}</span>,
            r.staffEmail || "System",
            LABEL[r.action] || r.action,
            <span className="num ad-muted">{r.targetType ? `${r.targetType} ${r.targetId?.slice(0, 8) ?? ""}` : "—"}</span>,
            r.detail ? (open === r.id
              ? <pre className="au-pre" onClick={() => setOpen(null)}>{JSON.stringify(r.detail, null, 2)}</pre>
              : <button className="cf-btn cf-btn--ghost cf-btn--sm" onClick={() => setOpen(r.id)}>Show</button>) : <span className="ad-muted">—</span>,
          ])} />
      )}
      <style>{`.au-pre{font-family:var(--font-mono),monospace;font-size:11.5px;color:var(--text-2);background:var(--surface-2);padding:8px 10px;border-radius:8px;max-width:420px;max-height:240px;overflow:auto;text-align:left;white-space:pre-wrap;word-break:break-word;cursor:pointer;}`}</style>
    </>
  );
}
