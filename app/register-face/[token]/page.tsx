import { verifyFaceToken } from "@/lib/faceToken";
import MobileFaceRegister from "./MobileFaceRegister";

export default async function RegisterFacePage({ params }: { params: { token: string } }) {
  const payload = verifyFaceToken(decodeURIComponent(params.token));

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-center p-8">
        <div>
          <div className="text-5xl mb-4">⏱️</div>
          <h1 className="text-xl font-bold mb-2">Link đã hết hạn</h1>
          <p className="text-slate-400 text-sm">Vui lòng yêu cầu quản trị viên tạo link mới (hiệu lực 20 phút).</p>
        </div>
      </div>
    );
  }

  return (
    <MobileFaceRegister
      token={params.token}
      employeeName={payload.employeeName}
    />
  );
}
