import { SITE } from "@/lib/site";
import { Callout, Contact, Doc, DocLink, Mail, Sec, Short, money } from "./parts";

/** The one app-wide rate per 1,000 verified views, e.g. "$1.00". */
const rate = `$${(SITE.rateCents / 100).toFixed(2)}`;

export default function ClipperTerms() {
  return (
    <Doc slug="clipper-terms">
      <Short
        items={[
          <>You must be 18+, in the US, and post from social accounts you own and control.</>,
          <>You can use a Streamer&apos;s VODs only for the Contract you joined.</>,
          <>Every Contract pays the same rate, set by {SITE.name} (currently {rate} per 1,000 verified views), and you keep 100% of it.</>,
          <>Every Contract clip must carry the paid-partnership label and #ad. Clips without it do not earn.</>,
          <>Earnings are Pending for {SITE.holdDays} days, then paid every {SITE.payoutDay} once you reach {money(SITE.minPayout)}.</>,
          <>Botted views, multiple accounts or duplicate posts mean lost earnings and suspension.</>,
        ]}
      />

      <Sec n={1} title="How these terms fit">
        <p>These Clipper Terms apply when you use {SITE.name} as a Clipper. They add to the <DocLink slug="terms" />, the <DocLink slug="acceptable-use" /> and the <DocLink slug="payouts" />. Capitalized words not defined here have the meaning given in the Terms.</p>
      </Sec>

      <Sec n={2} title="Who can be a Clipper">
        <ul>
          <li>You must be at least 18 and live in the United States.</li>
          <li>You must be able to receive payouts through our payment processor, including passing its identity and tax checks.</li>
          <li>You may have only one Clipper account. Each social account you connect must be yours, and may be connected to only one Clip Farm account.</li>
        </ul>
      </Sec>

      <Sec n={3} title="Your relationship with Clip Farm and Streamers">
        <p>You are an independent contractor. You are not an employee, agent or partner of {SITE.name} or of any Streamer. You decide whether to join a Contract, which clips to make, and when to post, within these terms and the <DocLink slug="acceptable-use" />. You are not entitled to benefits, minimum pay or reimbursement of expenses. You are responsible for your own taxes, equipment and costs.</p>
      </Sec>

      <Sec n={4} title="Joining a Contract">
        <ul>
          <li>{SITE.name} sets one rate for all Contracts. It is shown when you sign up and on our pricing page, and is currently {rate} per 1,000 verified views.</li>
          <li>A Contract&apos;s rate is locked when the Contract goes live and never changes for that Contract. If we change the rate, the new rate applies only to Contracts that go live afterwards, and we will ask you to accept updated terms.</li>
          <li>One set of rules applies to every Contract: these terms, the <DocLink slug="terms" /> and the <DocLink slug="acceptable-use" />, which you accept when you sign up. Contracts differ only by Streamer, budget and dates.</li>
          <li>A Contract can end at any time, including when its budget runs out. Once a budget is used up, new views do not earn, even if your clip keeps getting views.</li>
          <li>A Streamer or {SITE.name} may remove you from a Contract for breaking these terms or the <DocLink slug="acceptable-use" />.</li>
        </ul>
      </Sec>

      <Sec n={5} title="The license you receive">
        <p>When you join a Contract, the Streamer gives you a limited, non-exclusive, non-transferable, royalty-free license to use the Streamer&apos;s VODs, name and likeness, through the {SITE.name} tools, to make clips and post them to your own connected accounts for that Contract.</p>
        <ul>
          <li>Posts you make during the Contract may stay up after the Contract ends. You may not make new posts from that Contract&apos;s material after it ends.</li>
          <li>You may not use the material for any other purpose. This includes selling it, using it in other paid deals, or posting it outside the Contract.</li>
          <li>The license covers only what the Streamer owns or controls. VODs can contain third-party material that the Streamer cannot license, such as copyrighted music, clips of other creators, or game footage covered by a publisher&apos;s rules. Remove or replace that material, or do not use that part.</li>
          <li>If a Streamer or rights holder asks for a clip to be taken down for a valid legal reason, you must remove it.</li>
        </ul>
      </Sec>

      <Sec n={6} title="Making and posting clips">
        <ul>
          <li>Our tools may cut clips automatically, including with AI. You are responsible for reviewing every clip, caption and title before posting.</li>
          <li>Clips must be faithful to what happened. Do not edit a clip to make a Streamer appear to say or do something they did not.</li>
          <li>Clips must follow these terms, the <DocLink slug="acceptable-use" />, and the rules of the platform you post to.</li>
          <li>We post to your connected accounts only the content you choose, at the time you choose or schedule. You can disconnect an account at any time.</li>
          <li>If the Streamer requires approval, the Streamer has 48 hours to approve or reject each clip. If they do neither, the clip is approved automatically.</li>
        </ul>
      </Sec>

      <Sec n={7} title="Disclosure is required">
        <Callout title="Every Contract clip is paid promotion">
          <p>You must turn on the platform&apos;s paid-partnership or branded-content label (on TikTok, &quot;Branded content&quot; or &quot;Paid partnership&quot;) and include #ad in the caption. Our tools set these for you where the platform allows. Do not remove or hide them, during or after the Contract.</p>
        </Callout>
        <p>This is required by the FTC&apos;s Endorsement Guides and by platform rules. Clips without proper disclosure do not earn. Repeated failures can lead to removal from Contracts or suspension.</p>
      </Sec>

      <Sec n={8} title="How you earn">
        <ul>
          <li>You earn the Contract rate (the {SITE.name} rate locked when the Contract went live) for every 1,000 verified views on eligible clips, prorated for partial thousands.</li>
          <li>Views are read from the platform&apos;s API. We count views for {SITE.viewWindowDays} days after a clip is submitted to a Contract. The same window applies to every Contract.</li>
          <li>&quot;Verified&quot; means the views passed our fraud and quality checks. We may exclude views we believe are not genuine.</li>
          <li>You keep 100% of the Contract rate. The {SITE.feePct}% platform fee is paid by the Streamer.</li>
          <li>Earnings are Pending for {SITE.holdDays} days, then become available. Higher trust tiers may have shorter holds.</li>
          <li>Available earnings are paid every {SITE.payoutDay} once your balance is at least {money(SITE.minPayout)}.</li>
        </ul>
        <p>Full details are in the <DocLink slug="payouts" />. Please read the <DocLink slug="earnings-disclaimer" />. There is no guarantee you will earn any amount.</p>
      </Sec>

      <Sec n={9} title="Fraud and its consequences">
        <p>The following are fraud under these terms:</p>
        <ul>
          <li>botted, purchased, incentivized or otherwise non-genuine views, including view-exchange groups and click farms;</li>
          <li>running more than one Clip Farm account, or connecting the same social account to more than one;</li>
          <li>posting the same or nearly the same clip more than once for pay, or claiming someone else&apos;s clip;</li>
          <li>deleting and reposting to reset view counting, or any trick to get paid for views that were not genuinely earned.</li>
        </ul>
        <p>If we find fraud, we may hold or reverse affected earnings, recover amounts already paid, remove you from Contracts, and suspend or close your account. You can appeal a reversal once, within 14 days, by following the steps in the <DocLink slug="payouts" />.</p>
      </Sec>

      <Sec n={10} title="Your social accounts">
        <p>Your social accounts belong to you, and you are responsible for them. Platforms may limit reach, remove posts or suspend accounts under their own rules. {SITE.name} is not responsible for platform decisions, and we cannot pay for views a platform does not report to us.</p>
      </Sec>

      <Sec n={11} title="Contact">
        <p>Clipper support: <Mail to={SITE.supportEmail} />.</p>
      </Sec>

      <Contact email={SITE.supportEmail} />
    </Doc>
  );
}
