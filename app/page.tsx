"use client";
import { useRef, useState } from "react";
import kb from "@/data/circulars.json";

type Src = { id: string; title: string; date: string } | null;
type Item = { q: string; loading?: boolean; error?: string; found?: boolean; answer?: string; lang?: string; source?: Src; sms?: string; ticket?: string };

const LANGS: [string, string][] = [["", "Auto"], ["hi-IN", "हिन्दी"], ["en-IN", "English"], ["bn-IN", "বাংলা"], ["ta-IN", "தமிழ்"], ["te-IN", "తెలుగు"], ["mr-IN", "मराठी"], ["gu-IN", "ગુજરાતી"], ["kn-IN", "ಕನ್ನಡ"], ["ml-IN", "മലയാളം"], ["pa-IN", "ਪੰਜਾਬੀ"]];
const CHIPS: [string, string][] = [["📝", "Exam form last date?"], ["🎓", "Scholarship ke liye kaun se documents chahiye?"], ["💰", "Fees kab tak bharni hai?"], ["🏠", "Hostel list kab aayegi?"]];

export default function Home() {
  const [lang, setLang] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<any>(null);
  const [form, setForm] = useState<Record<number, { name: string; phone: string; err?: boolean }>>({});

  const tl = () => lang || (typeof navigator !== "undefined" ? navigator.language : "en-IN");
  const patch = (i: number, p: Partial<Item>) => setItems((s) => s.map((x, j) => (j === i ? { ...x, ...p } : x)));

  function speak(text: string, l?: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
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
    setItems((s) => [{ q: question, loading: true }, ...s]);
    // newest item is always index 0; keep other indexes stable by shifting form state
    setForm((f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [Number(k) + 1, v])));
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      if (!r.ok) throw new Error();
      const o = await r.json();
      patch(0, { loading: false, ...o });
      if (o.found) speak(o.answer, o.lang);
    } catch {
      patch(0, { loading: false, error: "Something went wrong. Please try again." });
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

  async function sendHandoff(i: number) {
    const f = form[i] || { name: "", phone: "" };
    const r = await fetch("/api/handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.name, phone: f.phone, question: items[i].q }) });
    if (!r.ok) return setForm({ ...form, [i]: { ...f, err: true } });
    const { ticket } = await r.json();
    patch(i, { ticket: `Ticket ${ticket} created for ${f.name}. A customer executive will call ${f.phone}.` });
  }

  return (
    <main>
      <h1>💬 SawaalNow</h1>
      <p className="sub">Ask in your own language. Speak or type. College helpdesk demo.</p>
      <div className="row">
        <label htmlFor="lang" className="lbl" style={{ margin: 0 }}>Language</label>
        <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)}>
          {LANGS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
        </select>
      </div>
      <div className="row" style={{ marginTop: 12, flexWrap: "nowrap" }}>
        <button className={"mic" + (listening ? " on" : "")} onClick={toggleMic} aria-label="Speak your question">🎤</button>
        <textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="अपना सवाल यहाँ लिखें / Type your question" aria-label="Your question"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }} />
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button style={{ flex: 1 }} disabled={busy} onClick={() => ask()}>Ask ➤</button>
      </div>
      <div className="chips">
        {CHIPS.map(([e, t]) => <button key={t} className="chip" onClick={() => ask(t)}>{e} {t}</button>)}
      </div>

      {items.map((it, i) => (
        <div className="card" key={items.length - i}>
          <p className="q">{it.q}</p>
          {it.loading && <p>…</p>}
          {it.error && <p className="warn">{it.error}</p>}
          {it.answer && (
            <>
              <p className="a">{it.answer}</p>
              <div className="row">
                <button onClick={() => speak(it.answer!, it.lang)}>🔊 Listen</button>
                <button className="sec" aria-label="Stop" onClick={() => window.speechSynthesis.cancel()}>🔇</button>
                {it.found && it.source && <span className="src">✔ Verified: {it.source.title} · {it.source.date}</span>}
                {it.found && <button className="sec" disabled={!!it.sms} onClick={() => patch(i, { sms: (it.answer + " -SawaalNow").slice(0, 160) })}>📱 SMS</button>}
              </div>
              {it.sms && <div className="box">SMS sent to your registered number (simulated): {it.sms}</div>}
              {!it.found && !it.error && (
                <div className="box">
                  {it.ticket ? it.ticket : (
                    <>
                      <label className="lbl">Name</label>
                      <input value={form[i]?.name ?? ""} onChange={(e) => setForm({ ...form, [i]: { ...form[i], name: e.target.value, phone: form[i]?.phone ?? "" } })} />
                      <label className="lbl">Phone</label>
                      <input inputMode="tel" style={form[i]?.err ? { borderColor: "var(--warn)" } : undefined} value={form[i]?.phone ?? ""} onChange={(e) => setForm({ ...form, [i]: { name: form[i]?.name ?? "", phone: e.target.value } })} />
                      <div className="row" style={{ marginTop: 10 }}><button onClick={() => sendHandoff(i)}>👤 Send to a human</button></div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ))}

      <details>
        <summary>Verified circulars the agent is allowed to use (sample data)</summary>
        {kb.map((c) => <p key={c.id}>{c.id} · {c.title} ({c.date}): {c.text}</p>)}
      </details>
    </main>
  );
}
