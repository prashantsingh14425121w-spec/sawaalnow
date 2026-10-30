import { NextResponse } from "next/server";
import kb from "@/data/circulars.json";

export async function GET() {
  return NextResponse.json(kb);
}
