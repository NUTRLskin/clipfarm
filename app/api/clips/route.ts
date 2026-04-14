import { NextResponse } from "next/server";
import { clips } from "@/lib/mockData";
export async function GET() { return NextResponse.json(clips); }
export async function POST(req: Request) {
  const body = await req.json();
  const c = {...body,id:"cl"+Date.now(),views:0,earned:0,status:"pending",date:new Date().toISOString().slice(0,10)};
  clips.push(c);
  return NextResponse.json(c,{status:201});
}
