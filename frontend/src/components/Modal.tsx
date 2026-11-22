import { useEffect } from "react";
import type { ReactNode } from "react";
import { XIcon } from "./icons";

// Bottom sheet on phones, centered card on larger screens.
export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="rise max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-6 shadow-2xl sm:max-w-md sm:rounded-3xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-xl font-extrabold leading-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-m-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-stone-100"
            style={{ minHeight: 40 }}
            aria-label="Close"
          >
            <XIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
