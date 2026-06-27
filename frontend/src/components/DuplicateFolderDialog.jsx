import React from "react";
import { FolderSimple, X } from "@phosphor-icons/react";

/**
 * Modal shown when a user tries to create a folder name that already exists
 * under the same parent. Offers to navigate into the existing folder so they
 * can add files there instead.
 */
export default function DuplicateFolderDialog({ open, folderName, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" data-testid="duplicate-folder-modal" onClick={onCancel}>
      <div className="bg-white border-2 border-black brutal-shadow max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-black">
          <div>
            <div className="mono-label">CONFLICT / 409</div>
            <h3 className="font-heading font-bold text-xl mt-1">Folder already exists</h3>
          </div>
          <button onClick={onCancel} className="w-9 h-9 border border-black flex items-center justify-center hover:bg-black hover:text-white" data-testid="duplicate-folder-close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 border border-zinc-200 bg-zinc-50 p-3 mb-4">
            <FolderSimple size={32} weight="duotone" color="#FF4500" />
            <div>
              <div className="mono-label">EXISTING</div>
              <div className="text-sm font-medium break-all" data-testid="duplicate-folder-name">{folderName}</div>
            </div>
          </div>
          <p className="text-sm text-zinc-700">
            A folder named <span className="font-mono">"{folderName}"</span> already exists in this location.
            Do you want to open it and add files there?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5 border-t border-zinc-200">
          <button
            data-testid="duplicate-folder-cancel"
            onClick={onCancel}
            className="bg-white text-black border border-black hover:bg-zinc-100 px-4 py-3 font-mono uppercase text-xs tracking-wider"
          >
            Cancel
          </button>
          <button
            data-testid="duplicate-folder-confirm"
            onClick={onConfirm}
            className="bg-[#FF4500] text-white hover:bg-black px-4 py-3 font-mono uppercase text-xs tracking-wider"
          >
            Yes, add files →
          </button>
        </div>
      </div>
    </div>
  );
}
