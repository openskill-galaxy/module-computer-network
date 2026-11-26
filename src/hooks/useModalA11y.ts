import { useEffect, useRef } from "react";

/**
 * 弹窗无障碍通用逻辑：
 * - Escape 关闭
 * - 打开时聚焦弹窗内首个可聚焦元素
 * - 关闭时还原焦点到触发元素
 * - 锁定 body 背景滚动
 * 返回的 ref 请挂到弹窗内容容器（card）上。
 */
export function useModalA11y(onClose: () => void) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  // onClose 常为内联箭头函数，用 ref 保持最新引用，避免副作用反复重跑
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const controls = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]'
    ) ?? []).filter((el) => el.tabIndex >= 0 && !el.matches(":disabled") && el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility === "visible");
    controls()[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
      if (e.key !== "Tab") return;
      const elements = controls();
      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;
      if (!elements.includes(active as HTMLElement) ||
          (e.shiftKey ? active === first : active === last)) {
        e.preventDefault();
        (e.shiftKey ? last : first)?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      prevActive?.focus?.();
    };
  }, []);

  return panelRef;
}
