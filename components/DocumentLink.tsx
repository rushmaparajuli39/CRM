"use client";

import { useState } from "react";
import { getSignedDocumentUrl } from "@/lib/actions/documents";

export default function DocumentLink({ path }: { path: string }) {
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const url = await getSignedDocumentUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={loading}
      className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
    >
      {loading ? "Opening…" : "View document"}
    </button>
  );
}
