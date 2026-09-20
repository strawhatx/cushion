"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Silently re-fetches the server-rendered dashboard on an interval, so conflicts stay current without a webhook. */
export default function RefreshOnInterval({ minutes }: { minutes: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), minutes * 60 * 1000);
    return () => clearInterval(id);
  }, [minutes, router]);

  return null;
}
