"use client";

import { useState } from "react";
import styles from "./page.module.css";

const shareText = "Your calendar doesn't know traffic exists. Cushion warns you before you book a meeting you can't get to.";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [waitlistState, setWaitlistState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [waitlistMessage, setWaitlistMessage] = useState("");
  const shareUrl = "https://cushion.app";

  async function joinWaitlist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWaitlistState("submitting");
    setWaitlistMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "waitlist" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not join the waitlist.");
      setWaitlistState("success");
      setWaitlistMessage("You're on the list. We'll be in touch.");
      setEmail("");
    } catch (error) {
      setWaitlistState("error");
      setWaitlistMessage(error instanceof Error ? error.message : "Could not join the waitlist.");
    }
  }

  function copyLink() {
    if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function sharePage() {
    if (navigator.share) navigator.share({ title: "Cushion", text: shareText, url: shareUrl }).catch(() => undefined);
    else copyLink();
  }

  return (
    <div className={`${styles.page} ${darkMode ? styles.dark : ""}`}>
      <div className={styles.wrap}>
        <header className={styles.topBar}>
          <div className={styles.mark}>CUSHION</div>
          <div className={styles.topBarActions}>
            <a className={styles.signInLink} href="/login">Sign in</a>
            <button className={styles.themeButton} onClick={() => setDarkMode(!darkMode)} aria-label="Toggle theme">{darkMode ? "☀" : "◐"}</button>
          </div>
        </header>
        <main>
          <section className={styles.hero}>
            <h1>Your calendar doesn&apos;t<br />know traffic exists.</h1>
            <p className={styles.sub}>Cushion checks real travel time between your meetings and warns you before you book something you can&apos;t physically get to.</p>
            <div className={styles.lineDiagram}>
              <div className={styles.stop}><div className={styles.rail}><div className={styles.node} /><div className={styles.track} /></div><div className={styles.stopContent}><div className={styles.stopTime}>2:00 - 2:30 PM</div><div className={styles.stopName}>Design review - HQ</div></div></div>
              <div className={`${styles.stop} ${styles.warn}`}><div className={styles.rail}><div className={styles.node} /><div className={styles.track} /></div><div className={styles.stopContent}><div className={styles.stopTime}>18 min needed to get there</div><div className={styles.gapWarning}>! only 8 min available</div></div></div>
              <div className={styles.stop}><div className={styles.rail}><div className={styles.node} /></div><div className={styles.stopContent}><div className={styles.stopTime}>2:38 - 3:15 PM</div><div className={styles.stopName}>Client call - Downtown office</div></div></div>
            </div>
            <a className={styles.cta} href="#waitlist">Get early access <span aria-hidden="true">-&gt;</span></a>
            <span className={styles.ctaNote}>not live yet - testing the idea first</span>
          </section>
          <div className={styles.facts}><div className={styles.fact}><b>Real</b> traffic data</div><div className={styles.fact}><b>Before</b> you book, not after</div><div className={styles.fact}><b>Works with</b> your existing calendar</div></div>
          <h2 className={styles.sectionTitle}>How it works</h2>
          <p className={styles.sectionLede}>No new calendar to switch to. It just watches the one you already use.</p>
          <div className={styles.board}>
            <BoardRow tag="CONNECT" title="Link your calendar" description="Google Calendar to start - it reads your schedule, nothing else." />
            <BoardRow tag="CHECK" title="It watches the gaps between events" description="Every time two meetings are close together, Cushion checks the real travel time between them." />
            <BoardRow tag="WARN" title="You get flagged before it's too late" description="If a gap's too tight, you'll know when you book it - not when you're already running late." />
          </div>
          <h2 className={styles.sectionTitle}>Before you ask</h2>
          <div className={styles.faqs}>
            <Faq question="Does it work for virtual meetings too?">Yes - it only flags gaps between events with a physical location. Back-to-back Zoom calls are left alone.</Faq>
            <Faq question="Do I need to change how I book meetings?">No. It reads your existing calendar in the background - nothing to change about how you already schedule things.</Faq>
            <Faq question="What about walking vs. driving?">It checks against however you&apos;d realistically get there - on the early access list, you&apos;ll be able to help shape this.</Faq>
          </div>
          <section className={styles.closing} id="waitlist">
            <h2>Stop finding out the hard way.</h2>
            <p>We&apos;re testing whether this is worth building. Get on the list and you&apos;ll be first to try it.</p>
            <form className={styles.waitlistForm} onSubmit={joinWaitlist}>
              <label className={styles.srOnly} htmlFor="waitlist-email">Email address</label>
              <input id="waitlist-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required autoComplete="email" />
              <button className={styles.cta} type="submit" disabled={waitlistState === "submitting"}>
                {waitlistState === "submitting" ? "Joining..." : "Get early access"} <span aria-hidden="true">-&gt;</span>
              </button>
            </form>
            {waitlistMessage && <p className={`${styles.waitlistMessage} ${waitlistState === "error" ? styles.waitlistError : ""}`} role="status">{waitlistMessage}</p>}
            <div className={styles.shareRow}>
              <button className={styles.shareButton} onClick={sharePage}>↗ Share</button>
              <a className={styles.shareButton} href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer">X</a>
              <a className={styles.shareButton} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer">f</a>
              <button className={`${styles.shareButton} ${copied ? styles.copied : ""}`} onClick={copyLink}>{copied ? "Copied!" : "Copy link"}</button>
            </div>
          </section>
        </main>
        <footer>Replace the early-access link before sharing this page.</footer>
      </div>
    </div>
  );
}

function BoardRow({ tag, title, description }: { tag: string; title: string; description: string }) {
  return <div className={styles.boardRow}><div className={styles.boardTag}>{tag}</div><div className={styles.boardText}><div className={styles.boardTitle}>{title}</div><div className={styles.boardDescription}>{description}</div></div></div>;
}

function Faq({ question, children }: { question: string; children: React.ReactNode }) {
  return <div className={styles.faq}><div className={styles.question}>{question}</div><p className={styles.answer}>{children}</p></div>;
}
