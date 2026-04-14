import { NextResponse } from "next/server";
import { clips, campaigns } from "@/lib/mockData";
export async function PATCH(req: Request, { params }: { params: Promise<{id:string}> }) {
  const {id} = await params;
  const body = await req.json();
  const idx = clips.findIndex(c=>c.id===id);
  if(idx===-1) return NextResponse.json({error:"Not found"},{status:404});
  const clip = clips[idx];
  if(body.action==="approve") {
    const views = body.views||0; const earned=(views/1000)*0.5;
    clips[idx]={...clip,status:"paid",views,earned};
    const ci=campaigns.findIndex(c=>c.id===clip.campaignId);
    if(ci!==-1){campaigns[ci].deliveredViews+=views;campaigns[ci].budgetUsed+=earned;campaigns[ci].clipsAccepted+=1;}
  } else if(body.action==="reject") { clips[idx]={...clip,status:"rejected"}; }
  return NextResponse.json(clips[idx]);
}
