import { ReactNode } from "react";

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
      <h2 className="mb-3 text-base font-semibold text-emerald-900">{title}</h2>
      {children}
    </section>
  );
}
