/** Shared styles for public marketing pages (streamers, pricing). */
export const MK_CSS = `
.mk{background:var(--bg);overflow-x:clip;}
.mk-wrap{max-width:1200px;margin:0 auto;padding-left:16px;padding-right:16px;}
.mk-hero{padding-top:56px;padding-bottom:40px;}
.mk-display{font-size:clamp(38px,6.6vw,68px);line-height:1.03;font-weight:600;letter-spacing:-0.045em;margin-top:14px;}
.mk-lede{font-size:clamp(16px,1.6vw,19px);line-height:1.55;color:var(--text-2);margin-top:20px;max-width:560px;}
.mk-ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px;}
.mk-sec{padding-top:64px;padding-bottom:64px;}
.mk-h2{font-size:clamp(28px,4vw,42px);line-height:1.1;font-weight:600;letter-spacing:-0.035em;}
.mk-p{font-size:16px;line-height:1.65;color:var(--text-2);margin-top:16px;max-width:460px;}
.mk-steps{list-style:none;display:grid;gap:16px;margin-top:32px;}
.mk-steps li{padding:28px 24px;border-radius:16px;background:var(--surface-1);border:1px solid var(--line);}
.mk-steps .num{font-size:13px;color:var(--brand-400);}
.mk-steps h3{font-size:21px;font-weight:600;letter-spacing:-0.02em;margin-top:24px;}
.mk-steps p{font-size:15px;color:var(--text-2);margin-top:8px;}
.mk-split{display:grid;gap:32px;align-items:center;}
.mk-list{list-style:none;display:grid;gap:4px;}
.mk-list li{display:flex;gap:12px;align-items:flex-start;padding:14px 0;border-bottom:1px solid var(--line);font-size:15.5px;}
.mk-list svg{color:var(--brand-400);flex-shrink:0;margin-top:4px;}
.mk-faq details{border-top:1px solid var(--line);}
.mk-faq details:last-child{border-bottom:1px solid var(--line);}
.mk-faq summary{list-style:none;display:flex;justify-content:space-between;gap:16px;padding:20px 0;font-size:17px;font-weight:500;cursor:pointer;}
.mk-faq summary::-webkit-details-marker{display:none;}
.mk-faq summary span{color:var(--text-3);font-size:22px;line-height:1;transition:transform .22s var(--ease);}
.mk-faq details[open] summary span{transform:rotate(45deg);}
.mk-faq p{font-size:15.5px;line-height:1.65;color:var(--text-2);padding:0 0 22px;}
.mk-final{text-align:center;padding-top:96px;padding-bottom:24px;display:flex;flex-direction:column;align-items:center;}
@media(min-width:768px){.mk-wrap{padding-left:24px;padding-right:24px;}.mk-steps{grid-template-columns:repeat(3,1fr);}.mk-sec{padding-top:96px;padding-bottom:96px;}.mk-hero{padding-top:88px;}}
@media(min-width:1000px){.mk-split{grid-template-columns:1fr 1.2fr;gap:72px;}}
`;
