import { SITE } from "@/lib/site";
import { Callout, Contact, Doc, DocLink, Mail, Sec, Short, money } from "./parts";

/** The one app-wide rate per 1,000 verified views, e.g. "$1.00". */
const rate = `$${(SITE.rateCents / 100).toFixed(2)}`;

export default function Payouts() {
  return (
    <Doc slug="payouts">
      <Short
        items={[
          <>Every Contract pays the same rate, set by {SITE.name} (currently {rate} per 1,000 verified views). Views count for {SITE.viewWindowDays} days after a clip is submitted.</>,
          <>New earnings are Pending for {SITE.holdDays} days while we check for fraud. Higher trust tiers can have shorter holds.</>,
          <>Payouts go out every {SITE.payoutDay} once your available balance is at least {money(SITE.minPayout)}.</>,
          <>Payments run through our payment processor. We never store your bank or card numbers.</>,
          <>If we reverse earnings, you can appeal once within 14 days.</>,
        ]}
      />

      <Sec n={1} title="Scope">
        <p>This policy explains how Clipper earnings are counted, held, reviewed and paid, and how Streamer budgets are used. It is part of our <DocLink slug="terms" />, <DocLink slug="clipper-terms" /> and <DocLink slug="streamer-terms" />. All amounts are in US dollars.</p>
      </Sec>

      <Sec n={2} title="How earnings are calculated">
        <ul>
          <li>{SITE.name} sets one rate for all Contracts. It is shown at sign-up and on our pricing page, and is currently {rate} per 1,000 verified views.</li>
          <li>A Contract&apos;s rate is locked when the Contract goes live and never changes for that Contract. If we change the rate, the new rate applies only to Contracts that go live afterwards, and we will ask you to accept updated terms.</li>
          <li>Earnings = (verified views / 1,000) x the Contract rate, prorated for partial thousands.</li>
          <li>We read views from each platform&apos;s API through our publishing provider. If a platform reports fewer views, reports late, or stops reporting, we can pay only for what is reported.</li>
          <li>Views count for {SITE.viewWindowDays} days after a clip is submitted to a Contract. The same window applies to every Contract. Views after that window do not earn.</li>
          <li>Earnings stop when a Contract&apos;s budget runs out, even if views keep coming in.</li>
          <li>Only eligible clips earn. A clip is eligible when it follows the <DocLink slug="clipper-terms" /> and <DocLink slug="acceptable-use" />, carries the required disclosure, was approved (or auto-approved after 48 hours), and passes our checks.</li>
        </ul>
      </Sec>

      <Sec n={3} title="Who pays what">
        <p>Clippers keep 100% of the Contract rate. Streamers pay the {SITE.feePct}% platform fee on top (currently ${((SITE.rateCents / 100) * (1 + SITE.feePct / 100)).toFixed(2)} per 1,000 verified views in total), drawn from their prepaid budget. {SITE.name} does not take a cut from Clipper earnings. Your payment processor or bank may charge its own fees for some payout options, such as instant transfers.</p>
      </Sec>

      <Sec n={4} title="Earning states">
        <ul>
          <li><strong>Pending.</strong> Newly counted earnings. They stay Pending for at least {SITE.holdDays} days while we run fraud and quality checks.</li>
          <li><strong>Available.</strong> Earnings that cleared the hold and review. These are included in the next payout.</li>
          <li><strong>Paid.</strong> Sent to your payout account.</li>
          <li><strong>Held.</strong> Earnings under extra review. We will tell you if earnings are held and why, where we can.</li>
          <li><strong>Reversed.</strong> Earnings removed because of fraud, error or a rule breach.</li>
        </ul>
      </Sec>

      <Sec n={5} title="Hold period and trust tiers">
        <p>The standard hold is {SITE.holdDays} days from when views are counted. We may shorten holds for accounts in higher trust tiers, based on account age, history and review results. We may lengthen a hold, or move an account to a lower tier, if we see signs of risk. Trust tiers are not a promise of any hold length.</p>
      </Sec>

      <Sec n={6} title="Payout schedule">
        <ul>
          <li>Payouts run weekly on {SITE.payoutDay}s.</li>
          <li>The minimum payout is {money(SITE.minPayout)}. If your available balance is lower, it carries over to the next week.</li>
          <li>Banks may take a few business days to show the money. Bank holidays can delay a payout.</li>
        </ul>
      </Sec>

      <Sec n={7} title="Setting up payouts">
        <p>Payouts are handled by our third-party payment processor. To get paid, you must create a payout account with the processor, verify your identity, and give tax information (such as a Form W-9). The processor collects your bank details directly. {SITE.name} never sees or stores full bank account or card numbers. If your payout account is not set up or fails verification, your balance stays with us until it is fixed.</p>
      </Sec>

      <Sec n={8} title="Taxes">
        <p>Clippers are independent contractors. Where required, we or our processor will issue a Form 1099. You are responsible for reporting your income and paying your taxes.</p>
      </Sec>

      <Sec n={9} title="Fraud review, holds and reversals">
        <p>We may hold or reverse earnings, and recover amounts already paid, if we reasonably believe they come from:</p>
        <ul>
          <li>botted, purchased or non-genuine views;</li>
          <li>multiple accounts, or a social account linked to more than one Clip Farm account;</li>
          <li>duplicate or reposted clips;</li>
          <li>missing or hidden paid-promotion disclosure;</li>
          <li>a breach of our <DocLink slug="clipper-terms" /> or <DocLink slug="acceptable-use" />;</li>
          <li>a calculation or reporting error.</li>
        </ul>
        <p>We may recover reversed amounts by offsetting your future earnings, or by other lawful means. Reversed amounts go back to the Streamer&apos;s budget.</p>
      </Sec>

      <Sec n={10} title="Appeals">
        <Callout title="One appeal, within 14 days">
          <p>If we reverse your earnings, you can appeal once, within 14 days of the reversal notice. Email <Mail to={SITE.supportEmail} /> with the subject &quot;Payout appeal,&quot; the clip links, and any evidence, such as platform analytics screenshots.</p>
        </Callout>
        <p>A person who was not part of the first decision will review your appeal. We aim to decide within 14 days and will tell you the result. The appeal decision is final under this policy. It does not limit your rights under the dispute section of our <DocLink slug="terms" />.</p>
      </Sec>

      <Sec n={11} title="Streamer chargebacks">
        <p>If a Streamer charges back a payment after Clippers were paid from it, the Streamer is responsible for the amount. We will not reverse Clipper earnings that were properly earned and paid because of a Streamer&apos;s chargeback.</p>
      </Sec>

      <Sec n={12} title="Closed accounts and unclaimed balances">
        <p>If your account closes, cleared earnings that are not tied to fraud or a breach will be paid once they meet the payout rules. If we cannot pay a balance for a long time, for example because no payout account is set up, we will try to contact you. We will handle unclaimed funds as state unclaimed-property laws require.</p>
      </Sec>

      <Sec n={13} title="Contact">
        <p>Payout questions: <Mail to={SITE.supportEmail} />.</p>
      </Sec>

      <Contact email={SITE.supportEmail} />
    </Doc>
  );
}
