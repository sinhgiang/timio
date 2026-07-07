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
  className = "",
  ...rest
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  minHeight?: number;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "style">) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
  }, [minHeight]);

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
