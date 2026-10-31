import { SITE } from "@/lib/site";
import { Callout, Contact, Doc, DocLink, Mail, Sec, Short, money } from "./parts";

/** The one app-wide rate per 1,000 verified views, e.g. "$1.00". */
const rate = `$${(SITE.rateCents / 100).toFixed(2)}`;

export default function Terms() {
  return (
    <Doc slug="terms">
      <Short
        items={[
          <>You must be 18 or older and in the United States to use {SITE.name}.</>,
          <>{SITE.name} is a marketplace. Streamers post paid contracts. Clippers make and post clips. We run the tools and handle payments, but we are not either side&apos;s employer or agent.</>,
          <>{SITE.name} sets one rate for every contract, currently {rate} per 1,000 verified views. Clippers keep 100% of it. Streamers pay a {SITE.feePct}% platform fee on top.</>,
          <>Earnings are held for {SITE.holdDays} days and checked for fraud, then paid every {SITE.payoutDay} once you reach {money(SITE.minPayout)}.</>,
          <>Most disputes go to individual arbitration, not court, and class actions are waived. You can opt out within 30 days (Section 19).</>,
        ]}
      />

      <Sec n={1} title="About these Terms">
        <p>These Terms of Service (&quot;Terms&quot;) are a contract between you and {SITE.legalEntity} (&quot;{SITE.name},&quot; &quot;we,&quot; &quot;us&quot;). They cover your use of our website, web app, tools and services (together, the &quot;Service&quot;).</p>
        <p>These Terms include the following policies, which are part of this agreement:</p>
        <ul>
          <li>the <DocLink slug="clipper-terms" /> (if you are a clipper);</li>
          <li>the <DocLink slug="streamer-terms" /> (if you are a streamer);</li>
          <li>the <DocLink slug="acceptable-use" />, <DocLink slug="payouts" />, <DocLink slug="dmca" /> and <DocLink slug="earnings-disclaimer" />.</li>
        </ul>
        <p>Our <DocLink slug="privacy" /> explains how we handle personal data. If a role-specific policy conflicts with these Terms, the role-specific policy controls for that topic.</p>
        <p>By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.</p>
        <Callout title="Please read Section 19 carefully">
          <p>It requires most disputes to be resolved by binding individual arbitration and waives class actions and jury trials. You may opt out within 30 days of first accepting these Terms.</p>
        </Callout>
      </Sec>

      <Sec n={2} title="Eligibility">
        <ul>
          <li>You must be at least 18 years old and able to form a binding contract.</li>
          <li>At launch, the Service is available only to people located in the United States. You must have a valid US payout account to receive earnings.</li>
          <li>You may not use the Service if you are barred from doing so under US law, appear on a US government sanctions list, or were previously removed from the Service by us.</li>
          <li>If you use the Service for a business, you confirm you are authorized to bind that business, and &quot;you&quot; includes the business.</li>
        </ul>
        <p>We may ask you to confirm your age and identity at any time. We may suspend your account if you cannot.</p>
      </Sec>

      <Sec n={3} title="Accounts">
        <ul>
          <li>You sign in with a supported third-party account, such as Twitch. You must keep that account secure. You are responsible for everything that happens under your Clip Farm account.</li>
          <li>Give us accurate information and keep it up to date. This includes your payout and tax details, which our payment processor collects.</li>
          <li>One person, one account. You may not create multiple accounts, share an account, or sell or transfer an account. See the <DocLink slug="acceptable-use" /> for multi-accounting rules.</li>
          <li>Tell us right away at <Mail to={SITE.supportEmail} /> if you believe your account has been accessed without permission.</li>
        </ul>
      </Sec>

      <Sec n={4} title="What Clip Farm is, and what it is not">
        <p>{SITE.name} is an online marketplace. It connects Twitch streamers who want short-form promotion (&quot;Streamers&quot;) with people who make and post short clips (&quot;Clippers&quot;). A Streamer posts a contract (&quot;Contract&quot;) with a prepaid budget. Every Contract pays the same rate per 1,000 verified views, set by {SITE.name} (the &quot;Rate&quot;), and follows the same rules: these Terms, the <DocLink slug="acceptable-use" />, and the <DocLink slug="clipper-terms" /> or <DocLink slug="streamer-terms" />, which you accept when you sign up. Contracts differ only by Streamer, budget and dates. Clippers join Contracts, use our tools to cut and edit clips from the Streamer&apos;s Twitch videos (&quot;VODs&quot;), and post them to their own social media accounts.</p>
        <ul>
          <li><strong>We are not a party to the deal between Streamers and Clippers</strong>, except as described in these Terms for payments, fees and enforcement.</li>
          <li>Clippers are independent. They are not our employees, agents or partners, and they are not the Streamer&apos;s employees. Nothing in these Terms creates an employment, joint venture, franchise or agency relationship.</li>
          <li>We do not control the social platforms (TikTok, Instagram, YouTube, Twitch). Those platforms decide what is shown, how views are counted, and whether an account or post stays up.</li>
          <li>We do not guarantee that any Contract will be available, that any clip will get views, or that any Clipper will earn any amount. See the <DocLink slug="earnings-disclaimer" />.</li>
        </ul>
      </Sec>

      <Sec n={5} title="Third-party services">
        <p>The Service depends on services we do not own. These include Twitch (sign-in and VOD access), a third-party social publishing service (to post to TikTok, Instagram and YouTube for you), social platform APIs (to read view counts), our payment processor, hosting providers and AI providers. Your use of each platform is also governed by that platform&apos;s own terms. You must follow them.</p>
        <p>When you connect a social account, you authorize us and our publishing provider to post the content you choose, at the time you choose or schedule, and to read that post&apos;s public metrics. You can disconnect at any time in Settings. We are not responsible for outages, API changes, policy changes or account actions by third parties. If a third party stops supporting a feature, we may change or remove that feature.</p>
      </Sec>

      <Sec n={6} title="Your content and the licenses you give">
        <p>&quot;Your Content&quot; means anything you upload, create, edit or post through the Service. This includes VODs, clips, captions, titles, comments and messages. You keep ownership of Your Content.</p>
        <p>You give {SITE.name} a worldwide, non-exclusive, royalty-free license to host, store, copy, process, transcode, transcribe, analyze, display and transmit Your Content. We use this license only to run, secure and improve the Service. This includes processing VODs with automated and AI tools to find and cut clips, generating captions, checking for fraud and duplicates, and showing clips to the Streamer for review. This license ends when Your Content is deleted from our systems, except for copies we must keep for legal, tax or safety reasons, as described on the <DocLink slug="data-deletion" /> page.</p>
        <p>You may let us show clips that were publicly posted under a Contract, with credit, in Clip Farm&apos;s own marketing. We will ask for your permission separately before doing this.</p>
        <p><strong>Streamer license to Clippers.</strong> When a Streamer posts a Contract, the Streamer gives Clippers who join it a license to use the Streamer&apos;s VODs to make and post clips for that Contract. Posts made during the Contract may stay up after it ends. The full terms are in the <DocLink slug="streamer-terms" /> and <DocLink slug="clipper-terms" />.</p>
        <p>You confirm that you have all rights needed to give these licenses, and that Your Content does not break any law or anyone else&apos;s rights. A Streamer can license only what the Streamer owns or controls. VODs may contain third-party material, such as music, other people&apos;s streams, or game footage, that no Streamer license covers. You are responsible for removing or getting rights to that material.</p>
      </Sec>

      <Sec n={7} title="Our license to you, and our property">
        <p>We give you a limited, personal, revocable, non-exclusive, non-transferable license to use the Service for its intended purpose, under these Terms. We and our licensors own the Service, including the software, design, logos and the {SITE.name} name. These Terms do not give you any right to our trademarks.</p>
        <p>If you send us feedback or ideas, we may use them without paying you or owing you anything.</p>
      </Sec>

      <Sec n={8} title="Rules of conduct">
        <p>You must follow the <DocLink slug="acceptable-use" />. In short, you may not:</p>
        <ul>
          <li>inflate views by bots, purchased views, view farms, or any non-genuine activity;</li>
          <li>run multiple accounts, post the same clip more than once for pay, or repost other people&apos;s clips;</li>
          <li>post doxxing, hate, harassment, or edits that misrepresent what a Streamer said or did;</li>
          <li>skip or hide the required paid-promotion disclosure;</li>
          <li>copy, scrape, reverse engineer, overload or interfere with the Service, or get around any limit or security feature;</li>
          <li>use the Service for anything illegal.</li>
        </ul>
      </Sec>

      <Sec n={9} title="Paid promotion and disclosure">
        <p>Contract clips are paid promotion. US law (including the FTC&apos;s Endorsement Guides) and platform rules require that paid content be clearly disclosed. Every Contract clip must carry the platform&apos;s paid-partnership or branded-content label (on TikTok, the &quot;Branded content&quot; or &quot;Paid partnership&quot; toggle) and the hashtag #ad. Our tools apply these where the platform allows it. You must not remove, hide or bury them. Clips without proper disclosure do not earn, and repeated failures may lead to suspension.</p>
      </Sec>

      <Sec n={10} title="Fees">
        <ul>
          <li><strong>The Rate.</strong> {SITE.name} sets one Rate for all Contracts. It is shown when you sign up and on our pricing page, and is currently {rate} per 1,000 verified views paid to Clippers. A Contract&apos;s Rate is locked when the Contract goes live and never changes for that Contract. If we change the Rate, the new Rate applies only to Contracts that go live afterwards, and we will ask you to accept updated terms.</li>
          <li><strong>Streamers</strong> pay the Rate plus a platform fee of {SITE.feePct}% of the Clipper earnings. For example, if Clippers earn $100 under a Contract, the Streamer&apos;s budget is charged $100 plus ${SITE.feePct} in fees. We show the full amount, including any fees, before you pay.</li>
          <li><strong>Clippers</strong> keep 100% of the Rate. We do not take a cut of Clipper earnings. Your payment processor or bank may charge its own fees for some payout options.</li>
          <li>We may change our fees with at least 30 days&apos; notice. Changes do not apply to Contracts already funded.</li>
          <li>Fees do not include taxes. You are responsible for any taxes that apply to you.</li>
        </ul>
      </Sec>

      <Sec n={11} title="Payments, budgets and payouts">
        <p>Payments are handled by a third-party payment processor. We never see or store full bank account or card numbers. By using payments, you also agree to the processor&apos;s terms. You may need to verify your identity and give tax information to the processor before you can receive money.</p>
        <ul>
          <li><strong>Budgets.</strong> Streamers prepay each Contract&apos;s budget. Earned amounts are drawn from that budget as verified views come in. When a budget runs out, the Contract stops paying.</li>
          <li><strong>Holds and reviews.</strong> Clipper earnings show as &quot;Pending&quot; for {SITE.holdDays} days while we run fraud and quality checks. We may hold earnings longer if a review is open.</li>
          <li><strong>Payouts.</strong> Cleared earnings are paid weekly on {SITE.payoutDay}s once your available balance is at least {money(SITE.minPayout)}. Smaller balances carry over.</li>
          <li><strong>Refunds.</strong> Unspent budget is refundable. Spent budget is not.</li>
          <li><strong>Reversals.</strong> We may withhold, reverse or recover earnings tied to fraud, error, or a breach of these Terms, as described in the <DocLink slug="payouts" />.</li>
          <li><strong>Chargebacks.</strong> If a Streamer disputes a payment after Clippers were paid, the Streamer is responsible for the amount and any fees. See the <DocLink slug="streamer-terms" />.</li>
        </ul>
        <p>Full details are in the <DocLink slug="payouts" />.</p>
      </Sec>

      <Sec n={12} title="Taxes and independent status">
        <p>Clippers and Streamers are each responsible for their own taxes. Clippers are independent contractors for tax purposes. Where the law requires, we or our payment processor will collect a Form W-9 and issue tax forms such as Form 1099. We do not give tax advice.</p>
      </Sec>

      <Sec n={13} title="Moderation and enforcement">
        <p>We may review, refuse, remove or disable any content, Contract, clip or account that we believe breaks these Terms or the law, harms others, or exposes us to risk. We use automated tools and human review. We may also limit features, hold or reverse earnings, cancel Contracts, or suspend or close accounts.</p>
        <p>Where it is practical and lawful, we will tell you what we did and why. You can appeal a reversal once, within 14 days, as described in the <DocLink slug="payouts" />. We are not obligated to monitor the Service, and we are not responsible for content posted by users.</p>
      </Sec>

      <Sec n={14} title="Copyright">
        <p>We respect copyright and respond to valid notices under the Digital Millennium Copyright Act. We close the accounts of repeat infringers in appropriate cases. See the <DocLink slug="dmca" />.</p>
      </Sec>

      <Sec n={15} title="Ending your account">
        <ul>
          <li><strong>By you.</strong> You can delete your account at any time in Settings. See <DocLink slug="data-deletion" />. Streamers with active Contracts should end them first.</li>
          <li><strong>By us.</strong> We may suspend or close your account at any time if you break these Terms, if we must for legal reasons, if your activity creates risk or possible loss for us or other users, or if we stop offering the Service. Where it is practical, we will give notice.</li>
          <li><strong>What happens to money.</strong> If your account closes, cleared earnings not tied to fraud or a breach will be paid out once they meet the payout rules. Unspent Streamer budget will be refunded, minus any amounts owed to us. We may keep amounts needed to cover chargebacks, reversals or losses caused by a breach.</li>
          <li><strong>What survives.</strong> Sections that by their nature should continue after the account ends will continue. These include licenses for posts already made, payment obligations, Sections 6 and 16 to 21, and the rules on fraud recovery.</li>
        </ul>
      </Sec>

      <Sec n={16} title="Disclaimers">
        <p>THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE FULLEST EXTENT ALLOWED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT.</p>
        <p>We do not promise that the Service will be uninterrupted, error-free or secure, that clips generated by automated or AI tools will be accurate or suitable, that view counts from third-party platforms will be complete or correct, or that any amount will be earned. You are responsible for reviewing every clip before you post it.</p>
      </Sec>

      <Sec n={17} title="Limitation of liability">
        <p>TO THE FULLEST EXTENT ALLOWED BY LAW:</p>
        <ul>
          <li>WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA, GOODWILL OR AUDIENCE, EVEN IF WE WERE TOLD THEY WERE POSSIBLE.</li>
          <li>OUR TOTAL LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE IS LIMITED TO THE GREATER OF (A) THE PLATFORM FEES YOU PAID US IN THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR (B) $100.</li>
          <li>WE ARE NOT LIABLE FOR THE ACTS OR CONTENT OF OTHER USERS OR THIRD-PARTY PLATFORMS.</li>
        </ul>
        <p>This section does not limit our duty to pay you earnings that are due under these Terms and the <DocLink slug="payouts" />, or any liability that cannot be limited by law. Some states do not allow certain limits, so some of them may not apply to you.</p>
      </Sec>

      <Sec n={18} title="Indemnity">
        <p>You will defend, indemnify and hold harmless {SITE.name}, its affiliates, and their officers, employees and agents from any claims, losses, damages, fines and costs (including reasonable attorneys&apos; fees) that arise from: Your Content; your use of the Service; your breach of these Terms or any law; your violation of anyone else&apos;s rights, including intellectual property and publicity rights; or, for Streamers, chargebacks and payment disputes on your account. We will tell you about any such claim and may choose to control the defense at our own cost.</p>
      </Sec>

      <Sec n={19} title="Dispute resolution, arbitration and class-action waiver">
        <p><strong>19.1 Try to resolve it first.</strong> Before filing a claim, you and we each agree to send a written notice describing the dispute and the relief wanted. Send yours to <Mail to={SITE.legalEmail} />. We will send ours to the email on your account. We both agree to try in good faith to resolve it for 60 days.</p>
        <p><strong>19.2 Binding individual arbitration.</strong> If we cannot resolve it, any dispute arising out of or relating to these Terms or the Service will be resolved by binding arbitration administered by the American Arbitration Association (&quot;AAA&quot;) under its Consumer Arbitration Rules, or its Commercial Arbitration Rules if you use the Service as a business. The Federal Arbitration Act governs this section. The arbitrator decides all issues, except that a court decides questions about the class-action waiver, the scope of this section, and whether a dispute must be arbitrated. Hearings may be held by video or in the county where you live. Payment of filing and arbitrator fees follows the AAA rules.</p>
        <p><strong>19.3 Exceptions.</strong> Either side may bring an individual claim in small claims court if it qualifies. Either side may ask a court to stop infringement or misuse of intellectual property.</p>
        <p><strong>19.4 Class-action and jury waiver.</strong> YOU AND WE EACH WAIVE THE RIGHT TO A JURY TRIAL AND TO TAKE PART IN A CLASS, COLLECTIVE OR REPRESENTATIVE ACTION. Claims may be brought only on an individual basis. The arbitrator may not combine claims or award class-wide relief. If this waiver is found unenforceable for a claim, that claim must be heard in court, not in arbitration.</p>
        <p><strong>19.5 Mass filings.</strong> If 25 or more similar demands are filed by or with help from the same lawyers or group, the AAA&apos;s mass arbitration rules will apply, and the cases may be handled in batches.</p>
        <p><strong>19.6 30-day opt-out.</strong> You can opt out of this arbitration agreement by emailing <Mail to={SITE.legalEmail} /> within 30 days after you first accept these Terms. Include your name, the email on your account, and a clear statement that you opt out of arbitration. Opting out does not affect the rest of these Terms.</p>
        <p><strong>19.7 Time limit.</strong> To the extent allowed by law, any claim must be filed within one year after it arose, or it is permanently barred.</p>
      </Sec>

      <Sec n={20} title="Governing law and venue">
        <p>These Terms are governed by the laws of the State of {SITE.state}, without regard to its conflict-of-law rules, and by the Federal Arbitration Act. For any dispute not subject to arbitration, you and we agree to the exclusive jurisdiction of the state and federal courts located in {SITE.state}.</p>
      </Sec>

      <Sec n={21} title="Changes to the Service and these Terms">
        <p>We may change the Service at any time. We may update these Terms. If a change is material, we will tell you by email or in the app at least 30 days before it takes effect, unless the change is required by law or is needed to stop abuse sooner. If you keep using the Service after the change takes effect, you accept it. If you do not agree, stop using the Service and delete your account. Changes to Section 19 will not apply to disputes we already knew about.</p>
      </Sec>

      <Sec n={22} title="General">
        <ul>
          <li><strong>Entire agreement.</strong> These Terms and the policies they include are the whole agreement between you and us about the Service.</li>
          <li><strong>Severability.</strong> If any part is found unenforceable, the rest stays in effect.</li>
          <li><strong>No waiver.</strong> If we do not enforce a right, we do not give it up.</li>
          <li><strong>Assignment.</strong> You may not transfer these Terms. We may transfer them in a merger, acquisition or sale of assets.</li>
          <li><strong>Force majeure.</strong> We are not liable for delays or failures caused by events outside our reasonable control, including platform outages and API changes.</li>
          <li><strong>Notices.</strong> We may send notices to the email on your account or in the app. You must send legal notices to <Mail to={SITE.legalEmail} />.</li>
          <li><strong>Not affiliated.</strong> {SITE.name} is not affiliated with or endorsed by Twitch, TikTok, Instagram, Meta, YouTube or Google.</li>
        </ul>
      </Sec>

      <Sec n={23} title="Contact">
        <p>For general help, email <Mail to={SITE.supportEmail} />. For legal notices, email <Mail to={SITE.legalEmail} />.</p>
      </Sec>

      <Contact email={SITE.legalEmail} />
    </Doc>
  );
}
