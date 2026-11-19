"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MOTION, gsap } from "@/lib/motion";
import { CloseIcon } from "./room/icons";

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

  // Opens with a short rise (GSAP), closes with a quicker fall, then the native close.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const animate = window.matchMedia(MOTION.ok).matches;
    if (open && !d.open) {
      d.showModal();
      if (animate) {
        gsap.fromTo(d, { opacity: 0, y: 14, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, clearProps: "all" });
      }
    }
    if (!open && d.open) {
      if (!animate) return d.close();
      const tween = gsap.to(d, {
        opacity: 0,
        y: 8,
        scale: 0.98,
        duration: 0.18,
        ease: "power2.in",
        onComplete: () => {
          d.close();
          gsap.set(d, { clearProps: "all" });
        },
      });
      return () => {
        tween.kill();
      };
    }
  }, [open]);

  // Leaving the page (a link inside the popup, e.g. "Sit at the table") must close it at once.
  // Next keeps the previous page alive but hidden, and a dialog left open there keeps the
  // whole new page inert: its fields can't be typed into until a reload.
  useEffect(() => {
    const d = ref.current;
    return () => {
      if (d?.open) d.close();
    };
  }, []);

  // Esc goes through the same exit as the close button.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [onClose]);

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
            className="btn-feel grid size-11 shrink-0 place-items-center rounded-full border border-transparent hover:border-[var(--line)] hover:bg-[var(--surface-raised)]"
          >
            <CloseIcon className="size-5" />
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
