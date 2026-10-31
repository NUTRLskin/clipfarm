"use client";
import { Head, Stat, Loading, Err, Table, Pill, Empty, useAdmin, usd } from "@/components/admin/AdminKit";

type Overview = { contracts: { held: number; awaitingPayment: number }; money: { clipperEarnings: number; fees: number } };
type Contract = { id: string; streamer: string; status: string; budget: number; spent: number; left: number; rate: number };

export default function AdminMoney() {
  const o = useAdmin<Overview>("/api/admin/overview");
  const c = useAdmin<Contract[]>("/api/admin/contracts");
  const refundable = (c.data || []).filter(x => x.status === "closed").reduce((a, x) => a + x.left, 0);

  return (
    <>
      <Head title="Money" sub="Where every dollar sits. Stripe balance matching, refunds and the accountant export arrive when Stripe is connected." />
      {(o.error || c.error) && <Err msg={o.error || c.error} onRetry={() => { o.reload(); c.reload(); }} />}
      {o.loading && !o.data ? <Loading rows={2} /> : o.data && (
        <div className="ad-grid">
          <Stat label="Held for live contracts" value={usd(o.data.contracts.held)} money sub="Prepaid, not spent" />
          <Stat label="Owed to clippers" value={usd(o.data.money.clipperEarnings)} money sub="Approved earnings" />
          <Stat label="Clip Farm fees" value={usd(o.data.money.fees)} money sub="Earned so far" />
          <Stat label="Refundable" value={usd(refundable)} sub="Unspent on ended contracts" />
        </div>
      )}
      <div className="ad-note" style={{ marginBottom: 16 }}>
        Until Stripe is connected, money arrives outside the app. Mark a contract as paid in Contracts only after the streamer&apos;s payment has landed.
        {o.data && o.data.contracts.awaitingPayment > 0 && <> Right now <b className="num">{usd(o.data.contracts.awaitingPayment)}</b> is waiting to be paid.</>}
      </div>
      {c.loading && !c.data ? <Loading /> : c.data && (
        <Table cols={["Contract", "Status", "Budget", "Spent", "Left"]}
          empty={<Empty title="No money has moved yet" body="Each contract's budget, spend and balance shows here." />}
          rows={c.data.map(x => [x.streamer, <Pill k={x.status} />, <span className="num">{usd(x.budget)}</span>, <span className="num">{usd(x.spent)}</span>, <span className="num money">{usd(x.left)}</span>])} />
      )}
    </>
  );
}
