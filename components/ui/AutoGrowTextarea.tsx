"use client";

import { useRef, useEffect, useCallback, type TextareaHTMLAttributes } from "react";

/**
 * Textarea tự giãn cao theo nội dung (như tờ A4) — không cuộn bên trong ô nhỏ.
 * Giãn khi người dùng gõ VÀ khi giá trị được đổ tự động (AI điền).
 */
export default function AutoGrowTextarea({
  value,
  onChange,
  minHeight = 120,
  maxHeight,
  className = "",
  ...rest
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  minHeight?: number;
  maxHeight?: number; // nếu đặt: giãn tới ngưỡng rồi cuộn, luôn hiện dòng mới nhất (như ô chat)
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "style">) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const target = Math.max(el.scrollHeight, minHeight);
    if (maxHeight && el.scrollHeight > maxHeight) {
      el.style.height = `${maxHeight}px`;
      el.style.overflowY = "auto";
      el.scrollTop = el.scrollHeight; // luôn thấy chữ mới nhất
    } else {
      el.style.height = `${target}px`;
      el.style.overflowY = "hidden";
    }
  }, [minHeight, maxHeight]);

  useEffect(() => { resize(); }, [value, resize]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => { onChange(e); resize(); }}
      rows={1}
      style={{ minHeight, overflow: "hidden", resize: "none" }}
      className={className}
      {...rest}
    />
  );
}
