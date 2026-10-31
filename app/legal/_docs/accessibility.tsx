import { SITE } from "@/lib/site";
import { Contact, Doc, Mail, Sec, Short } from "./parts";

export default function Accessibility() {
  return (
    <Doc slug="accessibility">
      <Short
        items={[
          <>We want everyone to be able to use {SITE.name}, including people who use assistive technology.</>,
          <>Our target is WCAG 2.2 Level AA.</>,
          <>Some parts, like the video editor, are still being improved.</>,
          <>If something blocks you, email <Mail to={SITE.supportEmail} /> and we will help.</>,
        ]}
      />

      <Sec n={1} title="Our commitment">
        <p>{SITE.name} aims to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA across our website and web app. We treat accessibility as part of quality, not an extra.</p>
      </Sec>

      <Sec n={2} title="What we do">
        <ul>
          <li>Use semantic HTML, clear headings and labeled form fields.</li>
          <li>Support keyboard navigation with visible focus indicators.</li>
          <li>Check color contrast against WCAG AA.</li>
          <li>Respect your system&apos;s reduced-motion setting.</li>
          <li>Design layouts that work on phones, tablets and desktops, and when zoomed.</li>
          <li>Generate captions for clips, which you can review and edit.</li>
          <li>Test with automated tools and by hand, including with screen readers.</li>
        </ul>
      </Sec>

      <Sec n={3} title="Known limits">
        <ul>
          <li><strong>Video editor.</strong> The timeline and trimming tools rely on drag gestures. We are adding full keyboard and screen-reader support.</li>
          <li><strong>Automatic captions.</strong> Captions are machine-generated and may contain errors. Please review them before posting.</li>
          <li><strong>Third-party content.</strong> Sign-in pages, payment pages and social platforms are run by others, and we cannot control their accessibility.</li>
        </ul>
      </Sec>

      <Sec n={4} title="Feedback and help">
        <p>If you have trouble using any part of {SITE.name}, email <Mail to={SITE.supportEmail} /> with the subject &quot;Accessibility.&quot; Tell us the page, what you were trying to do, and the device or assistive technology you use. We aim to reply within 5 business days. We can also help you complete a task another way while we fix the issue.</p>
      </Sec>

      <Sec n={5} title="Review">
        <p>We review this statement when we make major changes, and at least once a year.</p>
      </Sec>

      <Contact email={SITE.supportEmail} />
    </Doc>
  );
}
