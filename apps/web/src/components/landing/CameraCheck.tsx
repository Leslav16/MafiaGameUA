"use client";

import { useState } from "react";
import { DeviceCheck } from "../lobby/DeviceCheck";
import { Modal } from "../Modal";
import { setPrefs } from "../prefs";
import type { RoomLabels } from "../room/types";

/**
 * Camera and mic check from the home page, before joining any table. The
 * camera only opens while the popup is open, and the chosen devices are
 * remembered for the game.
 */
export function CameraCheck({ label, title, labels, className }: { label: string; title: string; labels: RoomLabels; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} closeLabel={labels.close} wide>
        {open && (
          <DeviceCheck
            labels={labels}
            ready={false}
            onReadyChange={() => {}}
            hideReady
            onDevicesChange={(c) => setPrefs({ cameraId: c.cameraId, micId: c.micId })}
          />
        )}
      </Modal>
    </>
  );
}
