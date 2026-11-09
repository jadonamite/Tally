"use client";

export function Sheet({ theme, onClose, children }: { theme: "light" | "dark"; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-stretch bg-black/50 sm:items-center sm:justify-center sm:p-6" onClick={onClose}>
      <div
        className={`${theme === "dark" ? "app-dark" : "app-light"} flex w-full flex-col overflow-y-auto bg-(--s-bg) p-5 pb-8 text-(--s-text) sm:max-h-[90dvh] sm:max-w-md sm:rounded-3xl sm:border sm:border-(--s-line) sm:bg-(--s-card) sm:pb-5 sm:shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex justify-end">
          <button onClick={onClose} aria-label="Close" className="min-h-11 rounded-full bg-(--s-card) px-4 text-xs font-semibold text-(--s-sub) sm:bg-transparent">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
