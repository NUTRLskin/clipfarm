import { SITE } from "@/lib/site";
import { Contact, Doc, DocLink, Sec, Short } from "./parts";

const ITEMS: [string, string, string, string][] = [
  ["authjs.session-token", "Cookie", "Strictly necessary", "Keeps you signed in. Expires when the session ends or after up to 30 days."],
  ["authjs.csrf-token", "Cookie", "Strictly necessary", "Protects sign-in forms from cross-site request forgery. Session."],
  ["authjs.callback-url", "Cookie", "Strictly necessary", "Returns you to the right page after sign-in. Session."],
];

export default function Cookies() {
  return (
    <Doc slug="cookies">
      <Short
        items={[
          <>We use a small number of cookies and local storage items, mostly to keep you signed in and secure.</>,
          <>We do not use advertising cookies, and we do not let ad networks track you on Clip Farm.</>,
          <>Any analytics we use measure how the product is used in aggregate, not to build ad profiles.</>,
          <>We honor Global Privacy Control signals.</>,
        ]}
      />

      <Sec n={1} title="What cookies and local storage are">
        <p>Cookies are small text files a website stores in your browser. Local storage is a similar browser feature that keeps small amounts of data on your device. In this policy, &quot;cookies&quot; covers both. This policy explains which ones {SITE.name} uses and why. It is part of our <DocLink slug="privacy" />.</p>
      </Sec>

      <Sec n={2} title="Types we use">
        <ul>
          <li><strong>Strictly necessary.</strong> Needed for sign-in, security and core features. The Service cannot work without them, so they cannot be turned off in our settings.</li>
          <li><strong>Functional.</strong> Remember choices you make, such as your role and editor preferences.</li>
          <li><strong>Analytics.</strong> Help us understand which pages and features are used, so we can fix problems and improve them. We configure analytics to avoid cross-site tracking and do not use it for advertising.</li>
        </ul>
        <p>We do not use advertising or retargeting cookies.</p>
      </Sec>

      <Sec n={3} title="Current list">
        <div className="lg-table" role="region" aria-label="Cookies and local storage" tabIndex={0}>
          <table>
            <thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Category</th><th scope="col">Purpose and duration</th></tr></thead>
            <tbody>{ITEMS.map(([n, t, c, p]) => <tr key={n}><th scope="row"><code>{n}</code></th><td>{t}</td><td>{c}</td><td>{p}</td></tr>)}</tbody>
          </table>
        </div>
        <p>On secure connections, sign-in cookie names may begin with <code>__Secure-</code> or <code>__Host-</code>. If we add an analytics or monitoring tool, we will add it to this list before it goes live.</p>
      </Sec>

      <Sec n={4} title="Third-party sites">
        <p>When you sign in with Twitch or connect TikTok, Instagram or YouTube, you visit those sites, and they set their own cookies under their own policies. Payment pages run by our payment processor also set their own cookies, mainly for fraud prevention.</p>
      </Sec>

      <Sec n={5} title="Your choices">
        <ul>
          <li>You can block or delete cookies in your browser settings. If you block strictly necessary cookies, you will not be able to sign in.</li>
          <li>You can clear local storage by signing out or clearing site data in your browser.</li>
          <li>If your browser sends a Global Privacy Control signal, we treat it as a request to opt out of any sale or sharing of personal information and turn off non-essential analytics for that browser.</li>
        </ul>
      </Sec>

      <Sec n={6} title="Changes">
        <p>We will update this page when we add or remove cookies, and change the &quot;Last updated&quot; date above.</p>
      </Sec>

      <Sec n={7} title="Contact">
        <p>Questions about cookies go to our privacy team at the address below.</p>
      </Sec>

      <Contact email={SITE.privacyEmail} />
    </Doc>
  );
}
