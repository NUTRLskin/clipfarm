/**
 * Staff permissions (admin spec 3b). Every section has Hidden / View / Edit; sensitive actions are
 * separate on/off switches. Checked on the server by requireStaff() in lib/admin/session.ts.
 */
export const SECTIONS = [
  { key: "home", label: "Home" },
  { key: "alerts", label: "Alerts" },
  { key: "users", label: "Users" },
  { key: "contracts", label: "Contracts" },
  { key: "clips", label: "Clips & views" },
  { key: "money", label: "Money" },
  { key: "payouts", label: "Payouts" },
  { key: "fraud", label: "Fraud queue" },
  { key: "disputes", label: "Disputes" },
  { key: "support", label: "Support inbox" },
  { key: "health", label: "Errors & health" },
  { key: "settings", label: "Settings" },
  { key: "audit", label: "Audit log" },
  { key: "staff", label: "Staff & permissions" },
] as const;
export type Section = (typeof SECTIONS)[number]["key"];

export const ACTIONS = [
  { key: "refunds", label: "Issue refunds" },
  { key: "approvePayouts", label: "Approve the Friday payout batch" },
  { key: "retryPayouts", label: "Retry failed payouts" },
  { key: "killSwitch", label: "Payout kill switch" },
  { key: "cancelContracts", label: "Cancel a contract" },
  { key: "fundContracts", label: "Mark a contract as paid (opens it)" },
  { key: "reverseEarnings", label: "Reverse earnings" },
  { key: "decideDisputes", label: "Decide disputes" },
  { key: "suspendUsers", label: "Suspend or ban users" },
  { key: "viewAsUser", label: "View as user" },
  { key: "seePersonalData", label: "See full personal data" },
  { key: "exportData", label: "Export data" },
  { key: "sendSupport", label: "Send support emails" },
  { key: "changeSettings", label: "Change platform settings" },
  { key: "approveTwoPerson", label: "Approve another staff member's two-person action" },
] as const;
export type Action = (typeof ACTIONS)[number]["key"];

export type Level = "hidden" | "view" | "edit";
export type Perms = { sections: Partial<Record<Section, Level>>; actions: Partial<Record<Action, boolean>> };
export type StaffRole = "owner" | "admin" | "manager" | "custom";
export const ROLES: { key: StaffRole; label: string; note: string }[] = [
  { key: "owner", label: "Owner", note: "Everything, always." },
  { key: "admin", label: "Admin", note: "Every section on. Can't manage Owners or change the rate." },
  { key: "manager", label: "Manager", note: "Only what you turn on." },
  { key: "custom", label: "Custom role", note: "A saved set of toggles." },
];

const RANK: Record<Level, number> = { hidden: 0, view: 1, edit: 2 };
const allSections = (l: Level) => Object.fromEntries(SECTIONS.map(s => [s.key, l])) as Record<Section, Level>;
const allActions = (on: boolean) => Object.fromEntries(ACTIONS.map(a => [a.key, on])) as Record<Action, boolean>;

/** Starting point for each role before per-person toggles. */
export function roleDefaults(role: string): Perms {
  if (role === "owner") return { sections: allSections("edit"), actions: allActions(true) };
  if (role === "admin") return { sections: { ...allSections("edit"), staff: "hidden" }, actions: { ...allActions(true), killSwitch: false } };
  return { sections: { ...allSections("hidden") }, actions: allActions(false) };
}

/** The permissions a staff member actually has: role defaults, then custom role, then per-person toggles. Owners can't be narrowed. */
export function effectivePerms(staff: { role: string; perms: unknown }, customRolePerms?: unknown): Perms {
  const base = roleDefaults(staff.role);
  if (staff.role === "owner") return base;
  const layers = [staff.role === "custom" ? customRolePerms : null, staff.perms].filter(Boolean) as Perms[];
  for (const p of layers) {
    for (const s of SECTIONS) { const v = p.sections?.[s.key]; if (v && v in RANK) base.sections[s.key] = v; }
    for (const a of ACTIONS) { const v = p.actions?.[a.key]; if (typeof v === "boolean") base.actions[a.key] = v; }
  }
  return base;
}

export const levelOf = (p: Perms, s: Section): Level => p.sections[s] || "hidden";
export const canSee = (p: Perms, s: Section) => RANK[levelOf(p, s)] >= 1;
export const canEdit = (p: Perms, s: Section) => levelOf(p, s) === "edit";
export const canDo = (p: Perms, a: Action) => p.actions[a] === true;

/** Keep only known keys and values, so stored perms can't carry junk. */
export function cleanPerms(input: any): Perms {
  const out: Perms = { sections: {}, actions: {} };
  for (const s of SECTIONS) { const v = input?.sections?.[s.key]; if (v === "hidden" || v === "view" || v === "edit") out.sections[s.key] = v; }
  for (const a of ACTIONS) { const v = input?.actions?.[a.key]; if (typeof v === "boolean") out.actions[a.key] = v; }
  return out;
}

/** Nobody can hand out more than they have: clamp `wanted` to the granter's own permissions. */
export function clampTo(granter: Perms, wanted: Perms): Perms {
  const out: Perms = { sections: {}, actions: {} };
  for (const [k, v] of Object.entries(wanted.sections) as [Section, Level][]) out.sections[k] = RANK[v] <= RANK[levelOf(granter, k)] ? v : levelOf(granter, k);
  for (const [k, v] of Object.entries(wanted.actions) as [Action, boolean][]) out.actions[k] = v && canDo(granter, k);
  return out;
}
