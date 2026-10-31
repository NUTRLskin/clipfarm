import { Suspense } from "react";
import AdminAuth from "@/components/admin/AdminAuth";

export default function Page() {
  return <Suspense><AdminAuth mode="invite" /></Suspense>;
}
