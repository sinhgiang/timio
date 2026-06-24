"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserPlus, Scan, ExternalLink, X } from "lucide-react";

const STORAGE_KEY = "timio_onboarding_dismissed";

interface Props {
  checkInUrl: string | null;
}

export default function OnboardingBanner({ checkInUrl }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 mb-6">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-blue-100 transition-colors"
        title="Đóng hướng dẫn"
      >
        <X className="w-4 h-4" />
      </button>

      <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Bắt đầu nào 🚀</p>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Thiết lập Timio trong 3 bước</h2>

      <div className="grid sm:grid-cols-3 gap-3">
        <Link href="/dashboard/employees" className="group bg-white rounded-xl p-4 border border-blue-100 hover:border-blue-400 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-600 transition-colors">
            <UserPlus className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-gray-900 text-sm mb-0.5">1. Thêm nhân viên</p>
          <p className="text-xs text-gray-500">Thêm danh sách nhân viên của công ty</p>
        </Link>

        <Link href="/dashboard/employees" className="group bg-white rounded-xl p-4 border border-blue-100 hover:border-blue-400 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-600 transition-colors">
            <Scan className="w-5 h-5 text-purple-600 group-hover:text-white transition-colors" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-gray-900 text-sm mb-0.5">2. Đăng ký khuôn mặt</p>
          <p className="text-xs text-gray-500">Chụp ảnh để nhận diện khi chấm công</p>
        </Link>

        {checkInUrl ? (
          <a href={checkInUrl} target="_blank" className="group bg-white rounded-xl p-4 border border-blue-100 hover:border-blue-400 hover:shadow-md transition-all">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-green-600 transition-colors">
              <ExternalLink className="w-5 h-5 text-green-600 group-hover:text-white transition-colors" strokeWidth={1.5} />
            </div>
            <p className="font-semibold text-gray-900 text-sm mb-0.5">3. Mở kiosk chấm công</p>
            <p className="text-xs text-gray-500">Đặt màn hình tại văn phòng để check-in</p>
          </a>
        ) : (
          <div className="bg-white rounded-xl p-4 border border-blue-100 opacity-50">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3">
              <ExternalLink className="w-5 h-5 text-green-600" strokeWidth={1.5} />
            </div>
            <p className="font-semibold text-gray-900 text-sm mb-0.5">3. Mở kiosk chấm công</p>
            <p className="text-xs text-gray-500">Cần tạo chi nhánh trước</p>
          </div>
        )}
      </div>

      <p className="text-xs text-blue-400 mt-3 text-right">Bấm × để đóng hướng dẫn này</p>
    </div>
  );
}
