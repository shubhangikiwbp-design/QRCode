import React from "react";

export default function PageHeader({ index, title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black pb-6">
      <div>
        <div className="mono-label">UNIT / {index}</div>
        <h1 className="font-heading font-black text-4xl sm:text-5xl tracking-tighter mt-1">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-600 mt-2 max-w-2xl">{subtitle}</p>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}
