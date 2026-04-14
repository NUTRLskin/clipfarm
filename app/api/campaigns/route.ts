import { NextResponse } from "next/server";
import { campaigns } from "@/lib/mockData";
export async function GET() { return NextResponse.json(campaigns); }
export async function POST(req: Request) {
  const body = await req.json();
  const c = {...body,id:"c"+Date.now(),deliveredViews:0,budgetUsed:0,clipsAccepted:0,status:"open",vods:[]};
  campaigns.push(c);
  return NextResponse.json(c,{status:201});
}
