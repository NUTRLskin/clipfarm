import { SITE } from "@/lib/site";
import { Contact, Doc, DocLink, Mail, Sec, Short } from "./parts";

export default function AcceptableUse() {
  return (
    <Doc slug="acceptable-use">
      <Short
        items={[
          <>Never allowed: doxxing, hate, harassment, and edits that mislead viewers about what a Streamer said or did.</>,
          <>Not allowed for Contracts at launch: adult content, gambling or casinos, political campaigns, and weapons.</>,
          <>No fake views, multiple accounts, or duplicate posts.</>,
          <>Every Contract clip needs the paid-partnership label and #ad.</>,
          <>Breaking these rules can mean removed content, lost earnings and a closed account.</>,
        ]}
      />

      <Sec n={1} title="Scope">
        <p>This policy applies to everyone who uses {SITE.name}, and to everything made or posted through it, including clips posted to TikTok, Instagram and YouTube. It is part of our <DocLink slug="terms" />. Platform rules also apply. If a platform rule is stricter, follow it.</p>
      </Sec>

      <Sec n={2} title="Never allowed">
        <ul>
          <li><strong>Doxxing.</strong> Sharing or threatening to share someone&apos;s private information, such as a home address, phone number, real name they keep private, workplace or family details.</li>
          <li><strong>Hate.</strong> Content that attacks or demeans people based on race, ethnicity, national origin, religion, caste, sex, gender identity, sexual orientation, disability, serious disease, age or veteran status.</li>
          <li><strong>Harassment.</strong> Bullying, threats, targeted insults, encouraging others to pile on, or unwanted sexual content directed at someone.</li>
          <li><strong>Misleading edits.</strong> Cutting, reordering, captioning or dubbing a clip so it shows a Streamer or anyone else saying or doing something they did not, or removes context in a way that changes the meaning. AI-generated or altered voices and faces of real people are not allowed in Contract clips.</li>
          <li><strong>Sexual content involving minors</strong> of any kind. We report it to the National Center for Missing and Exploited Children.</li>
          <li><strong>Violence and dangerous acts.</strong> Threats, glorifying violent attacks, or promoting self-harm or dangerous challenges.</li>
          <li><strong>Illegal content or activity</strong>, including fraud, scams, and selling illegal goods or services.</li>
          <li><strong>Infringement.</strong> Content that infringes copyright, trademark, privacy or publicity rights. See the <DocLink slug="dmca" />.</li>
          <li><strong>Impersonation.</strong> Pretending to be a Streamer, another Clipper, or {SITE.name}.</li>
        </ul>
      </Sec>

      <Sec n={3} title="Restricted categories">
        <p>At launch, Contracts may not promote, and Contract clips may not feature as their focus:</p>
        <ul>
          <li>adult or sexually explicit content;</li>
          <li>gambling, casinos, sports betting, sweepstakes casinos or gambling sponsorships;</li>
          <li>political campaigns, candidates, parties, ballot measures or political fundraising;</li>
          <li>weapons, ammunition or weapon accessories.</li>
        </ul>
        <p>We may open some of these later with extra rules. Until then, we will remove Contracts and clips in these categories.</p>
      </Sec>

      <Sec n={4} title="Marketplace integrity">
        <ul>
          <li>No botted, purchased, incentivized or otherwise fake views, likes or follows.</li>
          <li>One Clip Farm account per person. No shared, borrowed, bought or sold accounts.</li>
          <li>No duplicate posts. Do not post the same or nearly the same clip more than once for pay, and do not repost someone else&apos;s clip.</li>
          <li>No collusion between Streamers and Clippers to move money in ways that do not reflect real views, or to avoid fees.</li>
          <li>Every Contract clip must carry the platform&apos;s paid-partnership or branded-content label and #ad.</li>
        </ul>
      </Sec>

      <Sec n={5} title="Protecting the Service">
        <ul>
          <li>Do not scrape, crawl or copy the Service or its data without written permission.</li>
          <li>Do not reverse engineer, probe, overload or disrupt the Service, or get around rate limits, access controls or security features.</li>
          <li>Do not upload malware or use the Service to send spam.</li>
          <li>If you find a security issue, report it to <Mail to={SITE.supportEmail} />. Do not access other users&apos; data.</li>
        </ul>
      </Sec>

      <Sec n={6} title="Enforcement">
        <p>We use automated checks and human review. Depending on how serious the issue is and your history, we may:</p>
        <ul>
          <li>warn you, or ask you to edit or delete a post;</li>
          <li>reject a clip, or remove it from a Contract&apos;s earnings;</li>
          <li>hold or reverse earnings, as described in the <DocLink slug="payouts" />;</li>
          <li>remove you from Contracts, limit features or lower your trust tier;</li>
          <li>suspend or permanently close your account;</li>
          <li>report illegal activity to the authorities.</li>
        </ul>
        <p>Where it is practical and safe, we will tell you what rule was broken. You can appeal earnings reversals once within 14 days. For other decisions, email <Mail to={SITE.supportEmail} /> and we will take another look.</p>
      </Sec>

      <Sec n={7} title="Reporting">
        <p>To report a clip, Contract or user, email <Mail to={SITE.supportEmail} /> with a link and a short description. For copyright, use the <DocLink slug="dmca" /> process.</p>
      </Sec>

      <Contact email={SITE.supportEmail} />
    </Doc>
  );
}
