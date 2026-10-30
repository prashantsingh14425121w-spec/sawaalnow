// Model names change often. Set GEMINI_MODEL to override; otherwise we try these in order
// and move to the next one only when a model is "not found" (404).
const FALLBACKS = ["gemini-3.8-flash", "gemini-3-flash-preview", "gemini-2.5-flash"];

export async function gemini(system: string, user: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("missing_key");
  const models = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL, ...FALLBACKS] : FALLBACKS;
  let last = "";
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
      }
    );
    if (res.ok) {
      const j = await res.json();
      return j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    }
    let d = "";
    try { d = (await res.json())?.error?.message ?? ""; } catch {}
    last = "gemini_" + res.status + " (" + model + ")" + (d ? ": " + d.slice(0, 160) : "");
    if (res.status !== 404) break;
  }
  throw new Error(last);
}
