import { NextResponse } from "next/server";
import { importVodRange } from "@/lib/importVod";
import { assetView, getOwnedProject, requireUser, route } from "@/lib/studio";

export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const p = await getOwnedProject((await params).id, user.id);
  const a = await importVodRange(p, await req.json());
  return NextResponse.json(assetView(a), { status: 201 });
});
