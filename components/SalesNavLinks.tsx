"use client";

const links = [
  { label: "Vấn đề", id: "pain" },
  { label: "Tính năng", id: "features" },
  { label: "Trợ lý AI", id: "ai-assistant" },
  { label: "Bảng giá", id: "pricing" },
  { label: "Demo", id: "demo" },
];

export default function SalesNavLinks({ className }: { className?: string }) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", "/");
    }
  };

  return (
    <>
      {links.map((l) => (
        <button
          key={l.id}
          onClick={() => scrollTo(l.id)}
          className={className ?? "hover:text-blue-600 transition-colors text-sm font-medium text-gray-600"}
        >
          {l.label}
        </button>
      ))}
    </>
  );
}
