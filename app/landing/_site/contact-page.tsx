"use client";

import { Download, Mail, Phone, Send } from "lucide-react";
import { CONTACT } from "./content";
import { CopyButton, SiteFooter } from "./contact";
import { LocaleProvider, useT } from "./locale";
import { Nav } from "./nav";
import { Crosses, Mark, Pill, RevealRoot } from "./ui";

/** vCard for "Save contact". The name comes as "Surname Given name" in Russian, "Given Surname" in English. */
function saveContact(name: string, ru: boolean) {
  const parts = name.split(" ");
  const [family, given] = ru ? [parts[0], parts.slice(1).join(" ")] : [parts.slice(1).join(" "), parts[0]];
  const card = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${family};${given};;;`,
    `FN:${name}`,
    "ORG:WikiAI",
    `TEL;TYPE=CELL:${CONTACT.phone.plain}`,
    `EMAIL;TYPE=INTERNET:${CONTACT.email.display}`,
    `URL:${CONTACT.telegram.href}`,
    "END:VCARD",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([card], { type: "text/vcard;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "WikiAI.vcf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ContactBody() {
  const { t, locale } = useT();
  const p = t.contactPage;
  const c = t.contact;
  const rows = [
    { key: "telegram", label: "Telegram", icon: Send, ...CONTACT.telegram, external: true },
    { key: "email", label: p.email, icon: Mail, ...CONTACT.email, external: false },
    { key: "phone", label: p.phone, icon: Phone, ...CONTACT.phone, external: false },
  ];
  return (
    <>
      <Nav base="/landing" ctaHref={CONTACT.telegram.href} />
      <main id="top" className="ws-contactpage">
        <div className="ws-frame ws-contactpage__frame">
          <Crosses />
          <div className="ws-contactpage__grid">
            <div className="ws-contactpage__copy hero-in">
              <p className="ws-micro">{p.label}</p>
              <h1 className="ws-contactpage__title">{p.title}</h1>
              <p className="ws-lead">{p.lead}</p>
              <p className="ws-micro ws-contactpage__next">{p.stepsTitle}</p>
              <ol className="ws-contactpage__steps">
                {p.steps.map((s, i) => (
                  <li key={i}>
                    <span className="ws-contactpage__n">{i + 1}</span>
                    <div>
                      <h2 className="ws-h3">{s.title}</h2>
                      <p className="ws-body">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="ws-contactcard hero-in" style={{ animationDelay: "0.15s" }}>
              <div className="ws-contactcard__head">
                <Mark className="ws-contactcard__mark" />
                <div>
                  <p className="ws-contactcard__name">{c.person}</p>
                  <p className="ws-contactcard__role">{c.role}</p>
                </div>
              </div>
              <ul className="ws-contactcard__rows">
                {rows.map(({ key, label, icon: Icon, display, href, external }) => (
                  <li key={key}>
                    <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="ws-contactcard__link">
                      <span className="ws-contactcard__icon">
                        <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <span>
                        <span className="ws-micro">{label}</span>
                        <span className="ws-contactcard__handle">{display}</span>
                      </span>
                    </a>
                    <CopyButton value={display} label={c.copy} done={c.copied} />
                  </li>
                ))}
              </ul>
              <div className="ws-contactcard__actions">
                <Pill href={CONTACT.telegram.href} external>
                  {c.telegram}
                </Pill>
                <button type="button" className="ws-ghostbtn" onClick={() => saveContact(c.person, locale === "ru")}>
                  <Download size={17} strokeWidth={1.75} aria-hidden="true" />
                  {p.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/** /contact in the landing's style: the same nav, frame, card language and footer. */
export function ContactSite({ fontClass }: { fontClass: string }) {
  return (
    <LocaleProvider>
      <RevealRoot className={`ws ${fontClass}`}>
        <ContactBody />
      </RevealRoot>
    </LocaleProvider>
  );
}
