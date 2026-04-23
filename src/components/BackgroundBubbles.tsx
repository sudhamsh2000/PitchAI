"use client";

export function BackgroundBubbles({ subtle = false }: { subtle?: boolean }) {
  const base = subtle ? "opacity-35 dark:opacity-28" : "opacity-55 dark:opacity-36";
  return (
    <div className={`pointer-events-none absolute inset-0 ${base}`}>
      <span
        className="bg-bubble left-[8%] top-[12%] h-20 w-20 bg-sky-300/22 dark:bg-sky-300/8"
        style={{ "--dur": "34s", "--delay": "0s", "--x": "10px", "--y": "-14px", "--blur": "2px" } as Record<string, string>}
      />
      <span
        className="bg-bubble right-[12%] top-[20%] h-14 w-14 bg-blue-300/22 dark:bg-blue-300/8"
        style={{ "--dur": "30s", "--delay": "-4s", "--x": "-10px", "--y": "-12px", "--blur": "1px" } as Record<string, string>}
      />
      <span
        className="bg-bubble left-[16%] bottom-[16%] h-[72px] w-[72px] bg-indigo-200/24 dark:bg-indigo-300/8"
        style={{ "--dur": "36s", "--delay": "-7s", "--x": "8px", "--y": "-12px", "--blur": "2px" } as Record<string, string>}
      />
      <span
        className="bg-bubble right-[18%] bottom-[12%] h-24 w-24 bg-sky-200/22 dark:bg-sky-200/8"
        style={{ "--dur": "38s", "--delay": "-9s", "--x": "-12px", "--y": "-14px", "--blur": "3px" } as Record<string, string>}
      />
      <span
        className="bg-bubble left-[38%] top-[10%] h-12 w-12 bg-pink-300/24 dark:bg-pink-300/8"
        style={{ "--dur": "32s", "--delay": "-5s", "--x": "7px", "--y": "-10px", "--blur": "1px" } as Record<string, string>}
      />
    </div>
  );
}

