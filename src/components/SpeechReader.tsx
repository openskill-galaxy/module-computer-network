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
    <div className="inline-flex items-center bg-surface-2 border border-line rounded-xl text-xs print:hidden">
      <button
        onClick={handleToggleSpeech}
        type="button"
        className={`min-h-11 px-3 font-semibold transition flex items-center gap-1 whitespace-nowrap ${
          speaking ? "text-cyan-700 dark:text-cyan-300 animate-pulse font-bold" : "text-muted hover:text-body"
        }`}
        title="讲义语音朗读"
      >
        <span>{speaking ? "停止朗读" : "语音朗读"}</span>
      </button>

      <label className="relative flex items-center">
        <select
          aria-label="朗读倍速"
          value={rate}
          onChange={(event) => handleRateChange(Number(event.target.value))}
          className="h-11 appearance-none rounded-r-xl border-l border-line bg-surface-2 pl-2 pr-7 text-sm text-body"
        >
          {[1, 1.25, 1.5].map((speed) => <option key={speed} value={speed}>{speed} 倍速</option>)}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-2 text-muted">▾</span>
      </label>
    </div>
  );
}
