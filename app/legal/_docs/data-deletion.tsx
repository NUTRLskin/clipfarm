import { SITE } from "@/lib/site";
import { Contact, Doc, DocLink, Mail, Sec, Short } from "./parts";

export default function DataDeletion() {
  return (
    <Doc slug="data-deletion">
      <Short
        items={[
          <>Delete your account yourself in Settings. It takes a minute.</>,
          <>We delete your personal data within 30 days.</>,
          <>We keep some records the law requires, such as payment and tax records, and records needed to prevent fraud.</>,
          <>Clips you posted to TikTok, Instagram or YouTube stay on those platforms until you delete them there.</>,
        ]}
      />

      <Sec n={1} title="How to delete your account">
        <ol>
          <li>Sign in to {SITE.name}.</li>
          <li>Open Settings, then Account.</li>
          <li>Choose Delete account and confirm.</li>
        </ol>
        <p>Your account is closed right away. You will get an email confirming the request.</p>
        <p>If you cannot sign in, email <Mail to={SITE.privacyEmail} /> from the email on your account with the subject &quot;Delete my account.&quot; We will verify your identity before deleting anything.</p>
      </Sec>

      <Sec n={2} title="Before you delete">
        <ul>
          <li><strong>Clippers.</strong> Earnings that are still Pending will finish their hold and review. If they clear, they will be paid to your connected payout account under the <DocLink slug="payouts" />. Keep your payout account active until then.</li>
          <li><strong>Streamers.</strong> End your active Contracts first. Unspent budget is refunded after pending earnings clear.</li>
          <li>Download a copy of your data in Settings if you want to keep it.</li>
        </ul>
      </Sec>

      <Sec n={3} title="What we delete">
        <p>Within 30 days of your request, we delete or de-identify:</p>
        <ul>
          <li>your profile, email and account settings;</li>
          <li>connected Twitch and social account tokens (we also revoke our access);</li>
          <li>VODs, source media, drafts and clips stored on {SITE.name};</li>
          <li>messages and usage data linked to you.</li>
        </ul>
        <p>Copies in backups are overwritten on our normal backup cycle and are not used in the meantime.</p>
      </Sec>

      <Sec n={4} title="What we keep, and why">
        <ul>
          <li><strong>Payment, payout, refund and tax records</strong>, for as long as tax and financial laws require (generally up to 7 years).</li>
          <li><strong>Fraud and enforcement records</strong>, to stop banned users from returning and to handle disputes.</li>
          <li><strong>Records needed for legal reasons</strong>, such as a pending dispute, copyright claim or legal hold.</li>
          <li><strong>De-identified or aggregate data</strong> that no longer identifies you.</li>
        </ul>
        <p>We keep these only as long as needed and protect them the same way. See the retention table in our <DocLink slug="privacy" />.</p>
      </Sec>

      <Sec n={5} title="Posts on other platforms">
        <p>Clips you posted through {SITE.name} live on the platform where you posted them. Deleting your {SITE.name} account does not delete them. Delete them on that platform if you want them gone. Streamers should note that the license for posts made during a Contract continues after the Contract or account ends.</p>
      </Sec>

      <Sec n={6} title="Disconnecting without deleting">
        <p>You can disconnect Twitch, TikTok, Instagram or YouTube at any time in Settings. You can also revoke access from each platform&apos;s own settings. When you disconnect, we stop accessing that account and delete its tokens.</p>
      </Sec>

      <Sec n={7} title="Other requests">
        <p>To delete specific data without closing your account, or to use other privacy rights, email <Mail to={SITE.privacyEmail} />.</p>
      </Sec>

      <Contact email={SITE.privacyEmail} />
    </Doc>
  );
}
