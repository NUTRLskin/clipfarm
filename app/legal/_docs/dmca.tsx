import { SITE } from "@/lib/site";
import { Contact, Doc, DocLink, Mail, Sec, Short } from "./parts";

export default function Dmca() {
  return (
    <Doc slug="dmca">
      <Short
        items={[
          <>If you believe content on {SITE.name} infringes your copyright, send a notice to <Mail to={SITE.dmcaEmail} />.</>,
          <>If your content was removed by mistake, you can send a counter-notice.</>,
          <>Clips posted to TikTok, Instagram or YouTube are hosted by those platforms. Send notices for those posts to the platform too.</>,
          <>We close the accounts of repeat infringers.</>,
        ]}
      />

      <Sec n={1} title="Our approach">
        <p>{SITE.name} respects intellectual property rights and expects users to do the same. We respond to notices of alleged infringement under the Digital Millennium Copyright Act, 17 U.S.C. 512 (&quot;DMCA&quot;). This policy is part of our <DocLink slug="terms" />.</p>
        <p>Contract clips are made under a license from the Streamer. That license covers only what the Streamer owns or controls. It does not cover third-party music, other creators&apos; content, or other material the Streamer does not own.</p>
      </Sec>

      <Sec n={2} title="Designated agent">
        <p>Send copyright notices to our designated agent:</p>
        <p>DMCA Agent, {SITE.legalEntity}<br />{SITE.mailingAddress}<br />Email: <Mail to={SITE.dmcaEmail} /></p>
      </Sec>

      <Sec n={3} title="Filing a notice">
        <p>Your notice must include:</p>
        <ol>
          <li>your physical or electronic signature, or that of someone authorized to act for the copyright owner;</li>
          <li>a description of the copyrighted work you say is infringed;</li>
          <li>the specific location of the material on {SITE.name}, such as a URL, so we can find it;</li>
          <li>your name, mailing address, phone number and email;</li>
          <li>a statement that you have a good-faith belief that the use is not authorized by the copyright owner, its agent or the law;</li>
          <li>a statement, under penalty of perjury, that the information in the notice is accurate and that you are the copyright owner or authorized to act for the owner.</li>
        </ol>
        <p>Notices missing these elements may not be valid. We may share your notice, including your name and contact details, with the user whose content you reported.</p>
      </Sec>

      <Sec n={4} title="What we do after a notice">
        <p>When we receive a valid notice, we remove or disable access to the material on {SITE.name} and tell the user who posted it. Earnings tied to removed clips may be held while the matter is open. If the material was also posted to a third-party platform, that platform controls the post there. You should also send your notice to that platform.</p>
      </Sec>

      <Sec n={5} title="Filing a counter-notice">
        <p>If you believe your content was removed by mistake or misidentification, you may send a counter-notice to <Mail to={SITE.dmcaEmail} />. It must include:</p>
        <ol>
          <li>your physical or electronic signature;</li>
          <li>a description of the material that was removed and where it appeared before removal;</li>
          <li>a statement, under penalty of perjury, that you have a good-faith belief the material was removed because of a mistake or misidentification;</li>
          <li>your name, address and phone number;</li>
          <li>a statement that you consent to the jurisdiction of the federal district court for your address (or, if you are outside the US, any district where {SITE.name} may be found), and that you will accept service of process from the person who sent the original notice or their agent.</li>
        </ol>
        <p>We will send your counter-notice to the person who filed the original notice. If they do not tell us within 10 business days that they have filed a court action, we may restore the material within 10 to 14 business days after we received your counter-notice.</p>
      </Sec>

      <Sec n={6} title="Repeat infringers">
        <p>We will, in appropriate circumstances, close the accounts of users who are repeat infringers. We track valid notices against each account. We may also limit or close accounts after fewer notices if the infringement is clear or serious.</p>
      </Sec>

      <Sec n={7} title="False claims">
        <p>Under 17 U.S.C. 512(f), anyone who knowingly makes a material misrepresentation in a notice or counter-notice may be liable for damages, including costs and attorneys&apos; fees. If you are not sure whether something infringes, consider talking to a lawyer first.</p>
      </Sec>

      <Sec n={8} title="Other claims">
        <p>For trademark, privacy or publicity concerns that are not copyright claims, email <Mail to={SITE.legalEmail} />.</p>
      </Sec>

      <Contact email={SITE.dmcaEmail} />
    </Doc>
  );
}
