"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A popup window on top of the page (native <dialog>: focus is trapped,
 * Esc closes it, the page behind can't be scrolled). Click outside to close.
 */
export function Modal({
  open,
  onClose,
  title,
  closeLabel,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="modal-title"
      className={`modal phase-surface m-auto max-h-[min(90dvh,56rem)] w-[calc(100%-2rem)] overflow-hidden rounded-xl border border-[var(--line)] p-0 text-[var(--text)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop:bg-black/60 backdrop:backdrop-blur-[2px] ${wide ? "max-w-5xl" : "max-w-xl"}`}
    >
      <div className="flex max-h-[inherit] flex-col">
        <header className="phase-transition flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-3 sm:px-7">
          <h2 id="modal-title" className="font-display text-2xl font-medium tracking-wide sm:text-3xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="grid size-11 place-items-center rounded-full text-2xl leading-none hover:bg-[var(--surface-raised)]"
          >
            ×
          </button>
        </header>
        <div className="overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">{children}</div>
      </div>
    </dialog>
  );
}

/** A button that opens a <Modal> with the given content. */
export function ModalButton({
  label,
  title,
  closeLabel,
  className,
  wide,
  children,
}: {
  label: ReactNode;
  title: string;
  closeLabel: string;
  className?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={className}>
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} closeLabel={closeLabel} wide={wide}>
        {children}
      </Modal>
    </>
  );
}
