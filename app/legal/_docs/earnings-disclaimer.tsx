import { SITE } from "@/lib/site";
import { Callout, Contact, Doc, DocLink, Sec, Short } from "./parts";

export default function EarningsDisclaimer() {
  return (
    <Doc slug="earnings-disclaimer">
      <Callout title="No guarantee of income">
        <p className="lg-big">{SITE.name} does not guarantee that you will earn any money. Any earnings examples we show are illustrative only. They are not typical. Most people earn less, and many earn nothing.</p>
      </Callout>

      <Short
        items={[
          <>You are paid only for verified views on eligible clips, and only while a Contract has budget left.</>,
          <>What you earn depends on things outside your control, such as platform algorithms, Contract budgets and competition.</>,
          <>Clipping takes time and effort. Count your costs and taxes.</>,
          <>This is not a job, and {SITE.name} is not your employer.</>,
        ]}
      />

      <Sec n={1} title="Examples are illustrative">
        <p>Our website, app, ads and social posts may show sample earnings, rates or calculators. These show how the math works. They are not promises or predictions, and they are not typical results. We do not claim that any user earned these amounts unless we say so clearly, and even then, your results will differ.</p>
      </Sec>

      <Sec n={2} title="What affects earnings">
        <ul>
          <li><strong>Views.</strong> Platforms decide who sees your clip. Most clips get few views.</li>
          <li><strong>Budget.</strong> Each Contract has a limited budget. When it runs out, views stop earning. Popular Contracts can run out fast.</li>
          <li><strong>Time window.</strong> Views count only for 30 days after posting by default.</li>
          <li><strong>Verification.</strong> Views that fail fraud or quality checks are not paid. Earnings can be held or reversed.</li>
          <li><strong>Approval and rules.</strong> Clips that break Contract rules, lack disclosure, or are rejected do not earn.</li>
          <li><strong>Platform actions.</strong> A platform can limit reach, remove a post, or suspend your account.</li>
          <li><strong>Availability.</strong> There may be few or no Contracts open at a given time.</li>
        </ul>
      </Sec>

      <Sec n={3} title="Costs and taxes">
        <p>You may have costs, such as your time, devices, internet service and software. You are responsible for your own taxes. Earnings shown in the app are before taxes.</p>
      </Sec>

      <Sec n={4} title="Not employment or investment">
        <p>Using {SITE.name} is not a job offer, employment, or a business opportunity that we sell. We do not charge Clippers to join. We do not offer financial, tax or investment advice.</p>
      </Sec>

      <Sec n={5} title="Testimonials">
        <p>If we share a user&apos;s results, we will say whether they were paid or given anything for sharing them, and whether their results are typical. They usually are not.</p>
      </Sec>

      <Sec n={6} title="More information">
        <p>See the <DocLink slug="payouts" /> for exactly how earnings are counted and paid, and the <DocLink slug="clipper-terms" /> for Clipper rules.</p>
      </Sec>

      <Contact email={SITE.supportEmail} />
    </Doc>
  );
}
