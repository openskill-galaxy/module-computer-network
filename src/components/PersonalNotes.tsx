import { useEffect, useState } from "react";
import { readRaw, removeKey, writeRaw } from "../utils/storage";

interface Props {
  targetType: "lesson" | "question";
  targetId: string;
}

export default function PersonalNotes({ targetType, targetId }: Props) {
  const storageKey = `note:${targetType}:${targetId}`;
  const legacyKey = `openskill-note-${targetType}-${targetId}`;
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const val = readRaw(storageKey, legacyKey);
    setNote(val);
    setIsOpen(Boolean(val.trim()));
    setSaveFailed(false);
    setSaved(false);
  }, [storageKey, legacyKey]);

  function handleSave(text: string) {
    setNote(text);
    let didSave = false;
    if (text === "") {
      let hasLegacy = false;
      try {
        hasLegacy = localStorage.getItem(legacyKey) !== null;
      } catch {
        hasLegacy = false;
      }
      if (hasLegacy) {
        didSave = writeRaw(storageKey, "");
      } else {
        didSave = removeKey(storageKey);
      }
    } else {
      didSave = writeRaw(storageKey, text);
    }
    setSaveFailed(!didSave);
    setSaved(didSave);
    if (didSave) setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="card p-4 my-4 border border-line bg-surface">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          aria-expanded={isOpen}
          className="note-toggle text-xs font-bold text-body hover:text-brand flex items-center gap-2 transition-colors"
        >
          <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
          个人学习笔记 {note.trim() && <span className="text-subtle font-normal">已有记录</span>}
        </button>
        {(saved || saveFailed) && (
          <span role="status" className={`text-[10px] font-semibold animate-fade-in ${saveFailed ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>
            {saveFailed ? "未保存到此浏览器" : "✓ 已保存"}
          </span>
        )}
        {saveFailed && (
          <button type="button" onClick={() => handleSave(note)} className="notes-inline-action text-[10px] text-brand-700 dark:text-brand-300 font-semibold hover:underline">
            重试保存
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-3 space-y-2 animate-fade-in">
          <textarea
            value={note}
            aria-label="个人学习笔记"
            onChange={(e) => handleSave(e.target.value)}
            placeholder="在此记录你的解题思路、重点误区或个人备忘..."
            rows={3}
            className="input text-xs leading-relaxed resize-y"
          />
          <div className="flex justify-between items-center text-[10px] text-subtle">
            <span>输入后自动保存到此浏览器</span>
            {note.trim() && (
              <button
                type="button"
                onClick={() => handleSave("")}
                className="notes-inline-action text-rose-700 dark:text-rose-400 hover:underline"
              >
                清空笔记
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
