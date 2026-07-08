import { prisma } from "@/lib/prisma";
import { verifyTalentToken } from "@/lib/talentToken";
import VerifiedBadge from "@/components/recruitment/VerifiedBadge";
import { BadgeCheck, MapPin, Briefcase } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hồ sơ xác thực — Timio",
  robots: { index: false, follow: false }, // riêng tư: chỉ ai có link mới xem
};

export default async function PublicProfilePage({ params }: { params: { token: string } }) {
  const parsed = verifyTalentToken(params.token);

  let profile: {
    name: string; desiredTitle: string | null; desiredArea: string | null;
    desiredSalaryMin: number | null; desiredSalaryMax: number | null; skills: string | null; bio: string | null;
    vScore: number | null; vAttendance: number | null; vPunctuality: number | null; vTenureMonths: number | null;
    vPromotions: number | null; vDevScore: number | null; vDevTrend: string | null; vReviewCount: number | null;
  } | null = null;

  if (parsed) {
    const tp = await prisma.talentProfile.findUnique({ where: { employeeId: parsed.employeeId } });
    if (tp && tp.isOpen) {
      const emp = await prisma.employee.findUnique({ where: { id: parsed.employeeId }, select: { name: true } });
      profile = {
        name: emp?.name ?? "Ứng viên",
        desiredTitle: tp.desiredTitle, desiredArea: tp.desiredArea,
        desiredSalaryMin: tp.desiredSalaryMin, desiredSalaryMax: tp.desiredSalaryMax,
        skills: tp.skills, bio: tp.bio,
        vScore: tp.vScore, vAttendance: tp.vAttendance, vPunctuality: tp.vPunctuality, vTenureMonths: tp.vTenureMonths,
        vPromotions: tp.vPromotions, vDevScore: tp.vDevScore, vDevTrend: tp.vDevTrend, vReviewCount: tp.vReviewCount,
      };
    }
  }

  const sal = (min: number | null, max: number | null) =>
    min && max ? `${(min / 1e6).toLocaleString("vi-VN")}–${(max / 1e6).toLocaleString("vi-VN")} triệu`
    : min ? `Từ ${(min / 1e6).toLocaleString("vi-VN")} triệu` : max ? `Đến ${(max / 1e6).toLocaleString("vi-VN")} triệu` : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        {!profile ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <BadgeCheck size={40} className="text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
            <h1 className="font-bold text-gray-800">Không tìm thấy hồ sơ</h1>
            <p className="text-sm text-gray-500 mt-1">Liên kết không hợp lệ, đã hết hạn, hoặc hồ sơ đã được ẩn.</p>
          </div>
        ) : (
          <>
            {/* Tên + mong muốn */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full mb-2">
                <BadgeCheck size={13} /> Hồ sơ xác thực bởi Timio
              </div>
              <h1 className="text-2xl font-bold text-gray-800">{profile.name}</h1>
              <div className="flex items-center justify-center gap-3 mt-1.5 text-sm text-gray-500 flex-wrap">
                {profile.desiredTitle && <span className="flex items-center gap-1"><Briefcase size={13} /> {profile.desiredTitle}</span>}
                {profile.desiredArea && <span className="flex items-center gap-1"><MapPin size={13} /> {profile.desiredArea}</span>}
              </div>
              {sal(profile.desiredSalaryMin, profile.desiredSalaryMax) && (
                <p className="text-sm font-semibold text-green-600 mt-1">Mong muốn: {sal(profile.desiredSalaryMin, profile.desiredSalaryMax)}</p>
              )}
            </div>

            {/* Thẻ xác thực (đầy đủ) */}
            <VerifiedBadge stats={profile} mode="full" />

            {/* Kỹ năng + giới thiệu */}
            {(profile.skills || profile.bio) && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4 mt-3 space-y-2">
                {profile.skills && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Kỹ năng</p>
                    <p className="text-sm text-gray-700">{profile.skills}</p>
                  </div>
                )}
                {profile.bio && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Giới thiệu</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{profile.bio}</p>
                  </div>
                )}
              </div>
            )}

            <p className="text-center text-xs text-gray-400 mt-6">
              Hồ sơ xác thực bằng dữ liệu chấm công thật · vận hành bởi <span className="font-medium text-gray-500">Timio</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
