import { SITE } from "@/lib/site";
import { Callout, Contact, Doc, DocLink, Mail, Sec, Short } from "./parts";

const CATEGORIES: [string, string, string][] = [
  ["Identifiers", "Name, username, email address, Twitch ID, connected social account handles and IDs, IP address, device and account IDs.", "Yes"],
  ["Customer records (Cal. Civ. Code 1798.80(e))", "Name, email, and payout status. Bank, card and tax ID numbers are collected by our payment processor, not by us.", "Yes"],
  ["Commercial information", "Contracts you posted or joined, budgets, earnings, payouts, refunds and chargebacks.", "Yes"],
  ["Internet or network activity", "Pages and features used, clicks, device and browser type, log and error data, security events.", "Yes"],
  ["Approximate geolocation", "Country, state or city inferred from your IP address. We do not collect precise location.", "Yes"],
  ["Audio, video and electronic content", "Twitch VODs, clips, captions and transcripts, titles, and messages you send through the Service. This can include your voice and image.", "Yes"],
  ["Platform metrics", "View counts and other public post metrics read from TikTok, Instagram and YouTube for clips posted through the Service.", "Yes"],
  ["Inferences", "Fraud and risk signals and trust tier, derived from how accounts and posts behave.", "Yes"],
  ["Sensitive personal information", "Account sign-in tokens. Government ID and tax ID numbers if our payment processor requires them; the processor holds these, and we receive only verification status.", "Yes, limited"],
];

const RETENTION: [string, string][] = [
  ["Account and profile data", "While your account is open, then deleted within 30 days of account deletion."],
  ["VODs, source media and draft clips", "While needed for an active Contract or your editing, then deleted on a rolling basis, and in any case within 30 days of account deletion."],
  ["Posted-clip records and view metrics", "For the life of the Contract and its payout and appeal periods, then kept in de-identified or aggregate form."],
  ["Payment, payout, refund and tax records", "As long as tax and financial laws require, generally up to 7 years."],
  ["Fraud and enforcement records", "As long as needed to prevent repeat abuse and handle disputes, generally up to 3 years after the last related event."],
  ["Server and security logs", "Generally up to 90 days, longer if needed to investigate an incident."],
  ["Support emails", "Up to 2 years after the conversation ends."],
];

export default function Privacy() {
  return (
    <Doc slug="privacy">
      <Short
        items={[
          <>We collect what we need to run the marketplace: your account, the content you work with, view counts, and payout status.</>,
          <><strong>We do not sell your personal data, and we do not share it for cross-context behavioral advertising.</strong></>,
          <>We share data with service providers who help us run Clip Farm, such as our payment processor, social publishing provider, hosting, analytics and AI vendors.</>,
          <>We never store full bank or card numbers. Our payment processor handles those.</>,
          <>You can see, download, correct or delete your data. Delete your account in Settings, or email <Mail to={SITE.privacyEmail} />.</>,
        ]}
      />

      <Sec n={1} title="Who we are and what this covers">
        <p>This Privacy Policy explains how {SITE.legalEntity} (&quot;{SITE.name},&quot; &quot;we,&quot; &quot;us&quot;) collects, uses, shares and protects personal information when you use our website, web app and services (the &quot;Service&quot;). It also serves as our notice at collection under the California Consumer Privacy Act, as amended by the California Privacy Rights Act (together, &quot;CCPA&quot;).</p>
        <p>The Service is for adults in the United States. This policy does not cover third-party platforms, such as Twitch, TikTok, Instagram or YouTube, which have their own privacy policies.</p>
      </Sec>

      <Sec n={2} title="Where we get personal information">
        <ul>
          <li><strong>From you.</strong> When you sign up, fill in your profile, post or join a Contract, edit clips, contact support, or answer a survey.</li>
          <li><strong>From Twitch.</strong> When you sign in with Twitch, we receive your Twitch ID, username, display name, profile image and email. For Streamers, we also access your VODs and channel details to run Contracts.</li>
          <li><strong>From social platforms, through our publishing provider.</strong> When you connect TikTok, Instagram or YouTube, we receive your account handle and ID, an access token, the IDs of posts made through the Service, and those posts&apos; view counts and public metrics.</li>
          <li><strong>From our payment processor.</strong> We receive your payout account status, verification status, the last digits of your payout account, and records of payments and payouts. We do not receive full bank or card numbers.</li>
          <li><strong>Automatically.</strong> From your device and browser when you use the Service, through logs, cookies and local storage. See our <DocLink slug="cookies" />.</li>
        </ul>
      </Sec>

      <Sec n={3} title="Categories of personal information we collect">
        <p>In the past 12 months, we have collected (or, before launch, plan to collect) the following categories, as the CCPA defines them. The last column shows whether we disclose the category to service providers for a business purpose.</p>
        <div className="lg-table" role="region" aria-label="Categories of personal information" tabIndex={0}>
          <table>
            <thead><tr><th scope="col">Category</th><th scope="col">Examples</th><th scope="col">Disclosed to service providers</th></tr></thead>
            <tbody>{CATEGORIES.map(([c, e, d]) => <tr key={c}><th scope="row">{c}</th><td>{e}</td><td>{d}</td></tr>)}</tbody>
          </table>
        </div>
        <p>We use sensitive personal information only for purposes the CCPA allows, such as providing the Service, verifying identity, preventing fraud and keeping accounts secure. We do not use it to infer characteristics about you.</p>
      </Sec>

      <Sec n={4} title="How we use personal information">
        <ul>
          <li><strong>To run the Service.</strong> Create accounts, sign you in, import VODs, cut and edit clips, post to your connected accounts when you choose, track views and calculate earnings.</li>
          <li><strong>To process payments.</strong> Charge Streamer budgets, pay Clippers, issue refunds, handle chargebacks and meet tax reporting duties.</li>
          <li><strong>To keep the marketplace fair and safe.</strong> Detect botted views, multi-accounting, duplicate posts and other fraud. Enforce our <DocLink slug="terms">Terms</DocLink> and <DocLink slug="acceptable-use" />. Set trust tiers.</li>
          <li><strong>To use AI and automated tools.</strong> Transcribe audio, find highlight moments, generate captions and suggest edits. These tools process VOD content you or a Streamer provide. We do not use them to make decisions that have legal or similarly significant effects on you without human review.</li>
          <li><strong>To communicate.</strong> Send account, payout and security notices, answer support requests, and send product updates. You can opt out of marketing emails at any time.</li>
          <li><strong>To improve the Service.</strong> Measure how features are used, fix bugs and plan new features, mostly with aggregate or de-identified data.</li>
          <li><strong>To meet legal duties.</strong> Respond to lawful requests, handle copyright notices, keep required records, and protect our rights and the rights of others.</li>
        </ul>
      </Sec>

      <Sec n={5} title="How we share personal information">
        <Callout title="We do not sell or share personal information">
          <p>We do not sell personal information, and we do not &quot;share&quot; it for cross-context behavioral advertising, as those terms are defined in the CCPA. We have not done so in the past 12 months. We do not knowingly sell or share the personal information of anyone under 16.</p>
        </Callout>
        <p>We disclose personal information only as follows:</p>
        <ul>
          <li><strong>Service providers</strong> that process data for us under contract and only to provide their service:
            <ul>
              <li>our <strong>payment processor</strong> (identity checks, charges, payouts, tax forms);</li>
              <li>our <strong>social publishing provider</strong> (posting to TikTok, Instagram and YouTube and reading post metrics);</li>
              <li><strong>hosting, storage, database and content-delivery</strong> providers;</li>
              <li><strong>analytics and error-monitoring</strong> providers;</li>
              <li><strong>AI vendors</strong> (transcription, captioning and clip detection). We choose vendors that agree not to use your data to train their general models;</li>
              <li><strong>email and support</strong> tools.</li>
            </ul>
          </li>
          <li><strong>Other users, as the marketplace requires.</strong> Streamers see the public handle, posted clips and view counts of Clippers in their Contracts. Clippers see a Streamer&apos;s public profile and Contract details. Clips you post are public on the platform where you post them.</li>
          <li><strong>Platforms you connect.</strong> When you post through the Service, the content and caption go to the platform you chose.</li>
          <li><strong>Legal and safety.</strong> When we believe in good faith that the law requires it, or to protect the rights, property or safety of users, the public or {SITE.name}.</li>
          <li><strong>Business transfers.</strong> In a merger, acquisition, financing or sale of assets, subject to this policy.</li>
          <li><strong>With your consent</strong>, or at your direction.</li>
        </ul>
      </Sec>

      <Sec n={6} title="How long we keep personal information">
        <p>We keep personal information only as long as we need it for the purposes above. Typical periods:</p>
        <div className="lg-table" role="region" aria-label="Retention periods" tabIndex={0}>
          <table>
            <thead><tr><th scope="col">Data</th><th scope="col">How long</th></tr></thead>
            <tbody>{RETENTION.map(([d, h]) => <tr key={d}><th scope="row">{d}</th><td>{h}</td></tr>)}</tbody>
          </table>
        </div>
        <p>See <DocLink slug="data-deletion" /> for what happens when you delete your account.</p>
      </Sec>

      <Sec n={7} title="Your privacy rights">
        <p>If you live in California, you have these rights under the CCPA. We extend the same rights to all US users.</p>
        <ul>
          <li><strong>Know and access.</strong> Ask what personal information we collected about you, where it came from, why we use it, and who we disclosed it to, and get a copy.</li>
          <li><strong>Delete.</strong> Ask us to delete personal information we collected from you, subject to legal exceptions.</li>
          <li><strong>Correct.</strong> Ask us to fix inaccurate personal information.</li>
          <li><strong>Portability.</strong> Get your data in a commonly used, machine-readable format.</li>
          <li><strong>Opt out of sale or sharing.</strong> We do not sell or share, so there is nothing to opt out of. We still honor Global Privacy Control signals as an opt-out.</li>
          <li><strong>Limit use of sensitive personal information.</strong> We use it only for allowed purposes, so this right does not change how we use it.</li>
          <li><strong>No discrimination or retaliation.</strong> We will not deny service, charge different prices or give a lower quality of service because you used your rights.</li>
        </ul>
      </Sec>

      <Sec n={8} title="How to use your rights">
        <ul>
          <li><strong>In the app.</strong> Go to Settings to download your data or delete your account.</li>
          <li><strong>By email.</strong> Write to <Mail to={SITE.privacyEmail} /> with the subject &quot;Privacy request&quot; and say which right you want to use.</li>
        </ul>
        <p>We will confirm receipt within 10 business days and respond within 45 days. If we need more time, we will tell you why, and may extend by up to another 45 days. We will verify your identity first, usually by asking you to sign in or confirm through the email on your account. You may use an authorized agent. We will ask for proof that you authorized the agent and may ask you to confirm your identity directly. If we deny a request, we will explain why.</p>
      </Sec>

      <Sec n={9} title="Security">
        <p>We use reasonable administrative, technical and physical safeguards, including encryption in transit, access controls and least-privilege access for staff. Sign-in and social tokens are stored encrypted. No system is perfectly secure. If a breach affects your personal information, we will notify you as the law requires.</p>
      </Sec>

      <Sec n={10} title="Children">
        <p>The Service is only for people 18 and older. We do not knowingly collect personal information from anyone under 18. If we learn that we have, we will delete it and close the account. If you believe a minor is using the Service, email <Mail to={SITE.privacyEmail} />.</p>
      </Sec>

      <Sec n={11} title="Where data is processed">
        <p>We store and process data in the United States. Some service providers may process data in other countries, under contracts that require them to protect it.</p>
      </Sec>

      <Sec n={12} title="Other notices">
        <ul>
          <li><strong>Do Not Track.</strong> There is no common standard for browser Do Not Track signals, so we do not respond to them. We do honor Global Privacy Control.</li>
          <li><strong>California &quot;Shine the Light.&quot;</strong> We do not disclose personal information to third parties for their own direct marketing.</li>
          <li><strong>Financial incentives.</strong> We do not offer financial incentives in exchange for personal information.</li>
          <li><strong>Platform data.</strong> Our use of data received from Google and YouTube APIs follows the YouTube API Services Terms and Google&apos;s privacy policy. You can revoke our access at any time in your Google security settings or by disconnecting in Settings.</li>
        </ul>
      </Sec>

      <Sec n={13} title="Changes to this policy">
        <p>We may update this policy. We will change the &quot;Last updated&quot; date above. If a change is material, we will tell you by email or in the app before it takes effect.</p>
      </Sec>

      <Sec n={14} title="Contact">
        <p>For privacy questions or requests, email <Mail to={SITE.privacyEmail} />.</p>
      </Sec>

      <Contact email={SITE.privacyEmail} />
    </Doc>
  );
}
