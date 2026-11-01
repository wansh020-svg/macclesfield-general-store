"use client";

// Controls shown on screen only (hidden when printing).
export default function PrintBar({ title, offer, hint }) {
  return (
    <div className="print:hidden bg-pine-dark text-canvas-light px-5 py-4 sticky top-0 z-50">
      <div className="max-w-3xl mx-auto flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="font-display font-900 text-xl">{title}</p>
          <p className="text-xs text-canvas-light/60">{hint}</p>
        </div>
        <form method="get" className="flex items-end gap-2">
          <label className="text-xs">
            <span className="block text-canvas-light/60 mb-1">Offer line (optional)</span>
            <input name="offer" defaultValue={offer} maxLength={60} placeholder="e.g. Free chips with your first order"
              className="rounded-xl bg-pine text-canvas-light placeholder:text-canvas-light/40 px-3 py-2 w-64 max-w-full" />
          </label>
          <button className="rounded-full border-2 border-canvas-light/40 font-display font-700 px-4 py-2">Update</button>
        </form>
        <button onClick={() => window.print()} className="rounded-full bg-gold text-ink font-display font-900 px-6 py-2">Print</button>
      </div>
    </div>
  );
}
