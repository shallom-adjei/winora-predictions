"use client";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

function AnalyticsTracker() {
  useEffect(() => {
    let visitorId = localStorage.getItem("visitor_id");
    if (!visitorId) {
      visitorId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2);
      localStorage.setItem("visitor_id", visitorId);
    }

    fetch("/api/record-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: window.location.pathname,
        referrer: document.referrer,
        visitorId,
      }),
    });
  }, []);

  return null;
}

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnalyticsTracker />
      <Toaster position="top-right" />
      {children}
    </>
  );
}