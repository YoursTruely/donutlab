"use client";

import { useState } from "react";
import { DatasetDashboard } from "@/components/dataset-dashboard";
import { MvpDashboard } from "@/components/mvp-dashboard";

type View = "dataset" | "company";

export default function Page() {
  const [view, setView] = useState<View>("dataset");

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-10 border-b border-emerald-200 bg-white/95 px-4 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-2">
          <button
            type="button"
            onClick={() => setView("dataset")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === "dataset" ? "bg-emerald-700 text-white" : "text-emerald-800 hover:bg-emerald-100"}`}
          >
            Dataset
          </button>
          <button
            type="button"
            onClick={() => setView("company")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === "company" ? "bg-emerald-700 text-white" : "text-emerald-800 hover:bg-emerald-100"}`}
          >
            Company Analysis
          </button>
        </div>
      </nav>
      {view === "dataset" ? <DatasetDashboard /> : <MvpDashboard />}
    </div>
  );
}
