import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Demo: tickets are only logged. In production, send to email/WhatsApp/CRM.
export async function POST(req: Request) {
  let b: { name?: string; phone?: string; question?: string } = {};
  try { b = await req.json(); } catch {}
  const name = String(b.name ?? "").trim().slice(0, 80);
  const phone = String(b.phone ?? "").replace(/\D/g, "").slice(-10);
  const question = String(b.question ?? "").slice(0, 500);
  if (!name || phone.length !== 10)
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  const ticket = "T" + Math.floor(1000 + Math.random() * 9000);
  console.log("[handoff]", ticket, name, phone, question);
  return NextResponse.json({ ticket });
}
