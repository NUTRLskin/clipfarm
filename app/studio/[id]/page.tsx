"use client";
import { use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Editor from "@/components/studio/Editor";

export default function StudioEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  if (status !== "authenticated") return null;
  return <Editor projectId={id} />;
}
