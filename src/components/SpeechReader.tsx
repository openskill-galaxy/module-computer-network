import { useEffect, useState } from "react";

interface Props {
  text: string;
}

export default function SpeechReader({ text }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      setSupported(true);
    }
  }, []);

  if (!supported) return null;

  function handleToggleSpeech() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*_#`[\]()]/g, " ").replace(/\n+/g, " ");
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "zh-CN";
      utterance.rate = rate;

      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
    }
  }

  function handleRateChange(newRate: number) {
    setRate(newRate);
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5 bg-surface-2 border border-line px-2.5 py-1 rounded-xl text-xs print:hidden">
      <button
        onClick={handleToggleSpeech}
        type="button"
        className={`font-semibold transition flex items-center gap-1 whitespace-nowrap ${
          speaking ? "text-cyan-700 dark:text-cyan-300 animate-pulse font-bold" : "text-muted hover:text-body"
        }`}
        title="讲义语音朗读"
      >
        <span>{speaking ? "⏸ 暂停朗读" : "语音朗读"}</span>
      </button>

      <div className="flex items-center gap-1 pl-1 border-l border-line text-[10px] text-subtle font-mono">
        <button
          type="button"
          onClick={() => handleRateChange(1.0)}
          className={`hover:text-body ${rate === 1.0 ? "text-cyan-700 dark:text-cyan-300 font-bold" : ""}`}
        >
          1x
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={() => handleRateChange(1.25)}
          className={`hover:text-body ${rate === 1.25 ? "text-cyan-700 dark:text-cyan-300 font-bold" : ""}`}
        >
          1.25x
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={() => handleRateChange(1.5)}
          className={`hover:text-body ${rate === 1.5 ? "text-cyan-700 dark:text-cyan-300 font-bold" : ""}`}
        >
          1.5x
        </button>
      </div>
    </div>
  );
}
