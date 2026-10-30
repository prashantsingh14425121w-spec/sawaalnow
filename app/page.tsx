"use client";
import { useEffect, useRef, useState } from "react";
import kb from "@/data/circulars.json";

type Src = { id: string; title: string; date: string; text: string } | null;
type Msg =
  | { id: number; role: "me"; text: string }
  | { id: number; role: "bot"; loading?: boolean; error?: boolean; found?: boolean; answer?: string; lang?: string; source?: Src; q: string; sms?: string; open?: boolean; fb?: "up" | "down"; ticket?: string };

const LANGS: [string, string][] = [["", "Auto"], ["hi-IN", "हिन्दी"], ["en-IN", "English"], ["bn-IN", "বাংলা"], ["ta-IN", "தமிழ்"], ["te-IN", "తెలుగు"], ["mr-IN", "मराठी"], ["gu-IN", "ગુજરાતી"], ["kn-IN", "ಕನ್ನಡ"], ["ml-IN", "മലയാളം"], ["pa-IN", "ਪੰਜਾਬੀ"]];
const TOPICS: [string, string][] = [["🎓 Admissions", "What documents are required for UG admission?"], ["🕒 Office hours", "कॉलेज के कार्यालय का समय क्या है?"], ["💰 Fees", "Fees kab tak bharni hai?"], ["🏠 Hostel", "Hostel list kab aayegi?"], ["📝 Exams", "Exam form last date?"], ["📚 Library", "Library kab tak khuli rehti hai?"]];
const DEPTS = ["Registrar Office", "Accounts / Fees", "Hostel Warden Office", "Examination Cell"];

let nid = 1;
export default function Home() {
  const [lang, setLang] = useState("");
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [esc, setEsc] = useState<number | null>(null);
  const [f, setF] = useState({ name: "", phone: "", dept: DEPTS[0], details: "", consent: false });
  const [ferr, setFerr] = useState("");
  const rec = useRef<any>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs]);

  const tl = () => lang || (typeof navigator !== "undefined" ? navigator.language : "en-IN");
  const patch = (id: number, p: any) => setMsgs((s) => s.map((m) => (m.id === id ? ({ ...m, ...p } as Msg) : m)));

  function speak(text: string, l?: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = l || tl();
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  async function ask(text?: string) {
    const question = (text ?? q).trim();
    if (!question || busy) return;
    setQ("");
    setBusy(true);
    const id = nid++;
    setMsgs((s) => [...s, { id: nid++, role: "me", text: question }, { id, role: "bot", loading: true, q: question }]);
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      if (!r.ok) throw new Error();
      const o = await r.json();
      patch(id, { loading: false, ...o });
      if (o.found) speak(o.answer, o.lang);
    } catch {
      patch(id, { loading: false, error: true });
    }
    setBusy(false);
  }

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert("Voice input is not supported in this browser. Try Chrome.");
    if (rec.current) { rec.current.stop(); return; }
    const r = new SR();
    r.lang = tl();
    r.onresult = (e: any) => ask(e.results[0][0].transcript);
    r.onend = r.onerror = () => { rec.current = null; setListening(false); };
    rec.current = r;
    setListening(true);
    r.start();
  }

  async function submitEsc() {
    const m = msgs.find((x) => x.id === esc);
    if (!m || m.role !== "bot") return;
    if (!f.name.trim() || f.phone.replace(/\D/g, "").length < 10) return setFerr("Please enter your name and a 10-digit phone number.");
    if (!f.consent) return setFerr("Please tick the consent box.");
    const r = await fetch("/api/handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.name, phone: f.phone, question: m.q, dept: f.dept, details: f.details }) });
    if (!r.ok) return setFerr("Could not create the ticket. Please try again.");
    const { ticket } = await r.json();
    patch(m.id, { ticket: `Ticket ${ticket} sent to ${f.dept}. They will call ${f.phone}.` });
    setEsc(null); setFerr("");
  }

  const escMsg = msgs.find((x) => x.id === esc);

  return (
    <>
      <header className="hdr">
        <span className="logo">SawaalNow</span>
        <span className="pill">College Helpdesk Demo</span>
        <span className="sp" />
        <select className="sel" aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value)}>
          {LANGS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
        </select>
      </header>
      <div className="layout">
        <aside className="side">
          <h4>TOPICS</h4>
          {TOPICS.map(([t, qq]) => <button key={t} className="nav" onClick={() => ask(qq)}>{t}</button>)}
          <div className="vbox"><b>{kb.length}</b> verified circulars loaded. Answers come only from these.</div>
        </aside>
        <main className="main">
          <div className="wrap">
            <div className="card">
              <span className="demo">Demo environment: sample college data</span>
              <h1>Ask anything about your college</h1>
              <p>Answers come strictly from approved circulars. If it can’t be verified, a human takes over. Ask in any language, by voice or text.</p>
              <div className="chips">{TOPICS.slice(0, 3).map(([, qq]) => <button key={qq} className="chip" onClick={() => ask(qq)}>{qq}</button>)}</div>
            </div>

            {msgs.map((m) =>
              m.role === "me" ? (
                <div className="me" key={m.id}><span>{m.text}</span></div>
              ) : (
                <div className={"bot" + (m.found || m.loading || m.error ? "" : " nv")} key={m.id}>
                  <div className="bh">
                    <span className="av">SN</span>SawaalNow Helpdesk Agent
                    {!m.loading && !m.error && <span className="badge">{m.found ? "✔ Verified" : "⚠ Not verified"}</span>}
                  </div>
                  {m.loading && <p className="dots">Searching verified circulars…</p>}
                  {m.error && <p className="err">Something went wrong. Please try again.</p>}
                  {m.answer && (
                    <>
                      <p className="ans">{m.answer}</p>
                      {m.found && m.source && (
                        <div className="src">
                          Source: {m.source.title} ({m.source.date}){" "}
                          <button onClick={() => patch(m.id, { open: !m.open })}>{m.open ? "Hide excerpt ▲" : "View excerpt ▼"}</button>
                          {m.open && <p className="ex">{m.source.text}</p>}
                        </div>
                      )}
                      <div className="acts">
                        <button className="btn" onClick={() => speak(m.answer!, m.lang)}>🔊 Listen</button>
                        <button className="btn" aria-label="Stop" onClick={() => window.speechSynthesis.cancel()}>🔇</button>
                        {m.found && <button className="btn" disabled={!!m.sms} onClick={() => patch(m.id, { sms: (m.answer + " -SawaalNow").slice(0, 160) })}>📱 SMS</button>}
                        {!m.found && !m.ticket && <button className="btn p" onClick={() => { setEsc(m.id); setFerr(""); }}>Escalate to a human</button>}
                      </div>
                      {m.sms && <div className="sms">SMS sent to your registered number (simulated): {m.sms}</div>}
                      {m.ticket && <div className="ok">{m.ticket}</div>}
                      {m.found && (
                        <div className="fb">Was this helpful?
                          <button disabled={!!m.fb} onClick={() => patch(m.id, { fb: "up" })}>{m.fb === "up" ? "👍 Thanks" : "👍"}</button>
                          <button disabled={!!m.fb} onClick={() => patch(m.id, { fb: "down" })}>{m.fb === "down" ? "👎 Noted" : "👎"}</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            )}
            <div ref={end} />
          </div>
        </main>
      </div>

      <div className="bar">
        <div className="in">
          <div className="box">
            <textarea value={q} maxLength={500} onChange={(e) => setQ(e.target.value)} aria-label="Your question" placeholder="Ask your question in English, Hindi, or Hinglish…"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }} />
            <div className="r">
              <button className={"mic" + (listening ? " on" : "")} aria-label="Speak your question" onClick={toggleMic}>🎤</button>
              <span style={{ fontSize: 12, color: "var(--mut)" }}>{q.length} / 500</span>
              <button className="btn p" disabled={busy || !q.trim()} onClick={() => ask()}>Send ➤</button>
            </div>
          </div>
          <div className="foot">AI answers are grounded in the approved circulars only.</div>
        </div>
      </div>

      {esc !== null && escMsg && escMsg.role === "bot" && (
        <div className="ov" onClick={() => setEsc(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Request human help</h2>
            <p style={{ margin: 0, color: "var(--mut)" }}>Your unresolved question will be sent to the college office.</p>
            <label className="lbl">Your question</label>
            <div className="qq">“{escMsg.q}”</div>
            <label className="lbl">Name</label>
            <input className="fld" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <label className="lbl">Phone</label>
            <input className="fld" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <label className="lbl">Department desk</label>
            <select className="fld" value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value })}>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select>
            <label className="lbl">Additional details (optional)</label>
            <textarea className="fld" rows={2} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} />
            <label className="chk"><input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />I agree to share my question and phone number with the office to resolve this ticket.</label>
            {ferr && <p className="err">{ferr}</p>}
            <div className="acts"><button className="btn" onClick={() => setEsc(null)}>Cancel</button><button className="btn p" style={{ flex: 1 }} onClick={submitEsc}>Submit ticket</button></div>
          </div>
        </div>
      )}
    </>
  );
}
