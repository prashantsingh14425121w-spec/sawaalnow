export async function gemini(system: string, user: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("missing_key");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
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
  if (!res.ok) {
    let d = "";
    try { d = (await res.json())?.error?.message ?? ""; } catch {}
    throw new Error("gemini_" + res.status + (d ? ": " + d.slice(0, 160) : ""));
  }
  const j = await res.json();
  return j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
