import { SITE } from "@/lib/site";
import { Callout, Contact, Doc, DocLink, Mail, Sec, Short } from "./parts";

/** The one app-wide rate per 1,000 verified views, e.g. "$1.00", and what Streamers pay all-in. */
const rate = `$${(SITE.rateCents / 100).toFixed(2)}`;
const allIn = `$${((SITE.rateCents / 100) * (1 + SITE.feePct / 100)).toFixed(2)}`;

export default function StreamerTerms() {
  return (
    <Doc slug="streamer-terms">
      <Short
        items={[
          <>You prepay each Contract&apos;s budget (at least ${SITE.minBudget}). Clippers earn the {SITE.name} rate, currently {rate} per 1,000 verified views, and you pay a {SITE.feePct}% platform fee on top ({allIn} per 1,000 in total).</>,
          <>You license Clippers to use your VODs for the Contract. Posts made during the Contract can stay up after it ends.</>,
          <>If you require approval, you have 48 hours to review each clip. After that, it is approved automatically.</>,
          <>Unspent budget is refundable. Spent budget is not.</>,
          <>If you charge back a payment after Clippers were paid, you are responsible for it.</>,
        ]}
      />

      <Sec n={1} title="How these terms fit">
        <p>These Streamer Terms apply when you use {SITE.name} to post Contracts. They add to the <DocLink slug="terms" />, the <DocLink slug="acceptable-use" /> and the <DocLink slug="payouts" />.</p>
      </Sec>

      <Sec n={2} title="Who can be a Streamer">
        <ul>
          <li>You must be at least 18, in the United States, and the owner of the Twitch channel you connect, or authorized to act for its owner.</li>
          <li>If you act for a business or agency, you confirm you can bind it and the channel owner to these terms.</li>
        </ul>
      </Sec>

      <Sec n={3} title="Posting a Contract">
        <ul>
          <li>{SITE.name} sets one rate for all Contracts. It is shown when you sign up and on our pricing page, and is currently {rate} per 1,000 verified views to Clippers, plus our {SITE.feePct}% platform fee.</li>
          <li>A Contract&apos;s rate is locked when the Contract goes live and never changes for that Contract. If we change the rate, the new rate applies only to Contracts that go live afterwards, and we will ask you to accept updated terms.</li>
          <li>One set of rules applies to every Contract: these terms, the <DocLink slug="terms" /> and the <DocLink slug="acceptable-use" />, which you and every Clipper accept at sign-up. Contracts differ only by budget and dates. The minimum budget is ${SITE.minBudget}.</li>
          <li>Views count for {SITE.viewWindowDays} days after a clip is submitted to your Contract. The same window applies to every Contract.</li>
          <li>You may not ask Clippers to hide disclosures or mislead viewers.</li>
          <li>Contracts in restricted categories (adult content, gambling or casinos, political campaigns, and weapons) are not allowed at launch.</li>
          <li>We may review, edit for clarity, decline or remove any Contract.</li>
        </ul>
      </Sec>

      <Sec n={4} title="Budget, fees and charges">
        <ul>
          <li>You prepay the Contract budget through our payment processor before the Contract goes live.</li>
          <li>As Clippers earn, we draw their earnings plus the {SITE.feePct}% platform fee from your budget. Example: $100 of Clipper earnings uses ${100 + SITE.feePct} of budget.</li>
          <li>When the budget is used up, the Contract stops paying. You can add funds to keep it running.</li>
          <li>You authorize us and our payment processor to charge your payment method for the amounts you approve.</li>
          <li>You are responsible for any taxes on your purchases.</li>
        </ul>
      </Sec>

      <Sec n={5} title="The license you give">
        <p>By posting a Contract, you give each Clipper who joins it a non-exclusive, royalty-free, worldwide license to use your Twitch VODs, channel name, and the name, voice and likeness that appear in them, through the {SITE.name} tools, to make, edit, caption and post short clips to the Clipper&apos;s own social accounts for that Contract.</p>
        <ul>
          <li>Clips posted while the Contract is active may stay up after it ends, and the license continues for those posts. Clippers may not make new posts from the Contract after it ends.</li>
          <li>You also give {SITE.name} a license to access, download, process and store your VODs, including with automated and AI tools, to run the Contract.</li>
          <li>You confirm you own or control the rights needed to give this license. You are responsible for third-party material in your VODs, such as music, guests or other creators&apos; content. If you cannot license something, tell us at <Mail to={SITE.supportEmail} /> before your Contract goes live.</li>
        </ul>
      </Sec>

      <Sec n={6} title="Clip approval">
        <p>If you require approval, you will see each clip before it earns. You have 48 hours to approve or reject it. If you do neither, it is approved automatically. Reject clips only for a real reason, such as breaking the <DocLink slug="acceptable-use" /> or misrepresenting you. You may not reject clips to avoid paying for compliant work. We may override rejections that are not made in good faith.</p>
      </Sec>

      <Sec n={7} title="Disclosure">
        <p>Contract clips are paid promotion of your channel. They carry the platform&apos;s paid-partnership or branded-content label and #ad. You must not ask Clippers to remove these. You are also responsible for following the FTC&apos;s Endorsement Guides in anything you post about the Contract yourself.</p>
      </Sec>

      <Sec n={8} title="Ending a Contract and refunds">
        <ul>
          <li>You can end a Contract at any time. When you do, no new clips can join it. Earnings from views counted before it ends are paid from your budget.</li>
          <li><strong>Unspent budget is refundable.</strong> After the Contract ends and pending earnings clear their hold and review, we refund what is left to your original payment method.</li>
          <li><strong>Spent budget is not refundable.</strong> This includes amounts paid to Clippers and the platform fee on those amounts.</li>
          <li>If we reverse a Clipper&apos;s earnings for fraud, the reversed amount goes back to your budget.</li>
        </ul>
      </Sec>

      <Sec n={9} title="Chargebacks and payment disputes">
        <Callout title="You are responsible for chargebacks">
          <p>If you dispute or charge back a payment after Clippers were paid from it, you remain responsible for the full amount and any dispute fees.</p>
        </Callout>
        <p>We may pause or end your Contracts, suspend your account, offset the amount against your other balances, and use lawful collection methods to recover it. If you think a charge is wrong, contact <Mail to={SITE.supportEmail} /> first. We will work with you to fix it.</p>
      </Sec>

      <Sec n={10} title="Conduct toward Clippers">
        <p>Treat Clippers with respect. Do not harass, threaten or dox them, ask them to break platform rules, or ask them to work outside {SITE.name} to avoid fees.</p>
      </Sec>

      <Sec n={11} title="Contact">
        <p>Streamer support: <Mail to={SITE.supportEmail} />.</p>
      </Sec>

      <Contact email={SITE.supportEmail} />
    </Doc>
  );
}
