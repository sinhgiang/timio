"use client";

import { useState } from "react";
import { BarChart3, CalendarCheck, Users, Wallet, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

interface Slide {
  icon: React.ReactNode;
  title: string;
  desc: string;
  examples: string[];
}

function getSlides(role: string): Slide[] {
  const base: Slide[] = [
    {
      icon: <BarChart3 className="w-6 h-6 text-blue-600" strokeWidth={1.5} />,
      title: "Tra cứu chấm công",
      desc: "Hỏi bất kỳ điều gì về dữ liệu chấm công của công ty — AI sẽ tự tìm và trả lời.",
      examples: ["Hôm nay có bao nhiêu người đi làm?", "Ai đi trễ nhiều nhất tháng này?", "Tuần này ai vắng mặt?"],
    },
    {
      icon: <CalendarCheck className="w-6 h-6 text-green-600" strokeWidth={1.5} />,
      title: "Nghỉ phép & việc chờ duyệt",
      desc: "Kiểm tra đơn nghỉ phép, đơn tăng ca, mọi việc đang chờ xử lý.",
      examples: ["Còn đơn nghỉ phép nào chưa duyệt?", "Tháng này ai nghỉ nhiều nhất?", "Có việc gì cần tôi xử lý không?"],
    },
  ];

  if (role === "owner" || role === "accountant") {
    base.push({
      icon: <Wallet className="w-6 h-6 text-purple-600" strokeWidth={1.5} />,
      title: "Lương & chi phí",
      desc: "Tra cứu quỹ lương, tiền phạt, tiền thưởng — chỉ admin và kế toán xem được.",
      examples: ["Tổng quỹ lương tháng này là bao nhiêu?", "Ai bị phạt đi trễ tháng 6?", "Tổng tiền tăng ca tháng này?"],
    });
  } else {
    base.push({
      icon: <Users className="w-6 h-6 text-purple-600" strokeWidth={1.5} />,
      title: "Thông tin nhân viên",
      desc: "Tìm nhanh thông tin liên lạc, phòng ban, ngày phép còn lại của nhân viên chi nhánh bạn.",
      examples: ["Số điện thoại của An là gì?", "Phòng kế toán có những ai?", "Ai sắp hết ngày phép năm?"],
    });
  }
  return base;
}

export default function ChatOnboarding({ role, onDone }: { role: string; onDone: () => void }) {
  const slides = getSlides(role);
  const [idx, setIdx] = useState(0);
  const slide = slides[idx];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
        {slide.icon}
      </div>
      <h3 className="font-bold text-gray-900 text-lg mb-2">{slide.title}</h3>
      <p className="text-sm text-gray-500 mb-5">{slide.desc}</p>

      <div className="w-full space-y-2 mb-6">
        {slide.examples.map((ex) => (
          <div key={ex} className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-left">
            &ldquo;{ex}&rdquo;
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-5">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="p-2 rounded-full border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50"
          aria-label="Trước"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <span key={i} className={`w-2 h-2 rounded-full ${i === idx ? "bg-blue-600" : "bg-gray-200"}`} />
          ))}
        </div>
        <button
          onClick={() => setIdx((i) => Math.min(slides.length - 1, i + 1))}
          disabled={idx === slides.length - 1}
          className="p-2 rounded-full border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50"
          aria-label="Sau"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <button
        onClick={onDone}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-blue-700"
      >
        <Sparkles className="w-4 h-4" strokeWidth={1.5} />
        Bắt đầu chat ngay
      </button>
    </div>
  );
}
