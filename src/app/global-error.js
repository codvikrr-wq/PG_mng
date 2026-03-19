"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ maxWidth: "28rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
            <div style={{ borderRadius: "9999px", backgroundColor: "#fef2f2", padding: "1rem" }}>
              <AlertTriangle style={{ width: "2.5rem", height: "2.5rem", color: "#ef4444" }} />
            </div>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>
                Critical Error
              </h1>
              <p style={{ color: "#6b7280" }}>
                A critical error occurred. Please refresh the page.
              </p>
            </div>
            <button
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                backgroundColor: "#111827",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              <RefreshCw style={{ width: "1rem", height: "1rem" }} />
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
