"use client";

// Nút "Đăng nhập/Đăng ký với Google" CHÍNH THỨC — dùng Google Identity Services
// (script accounts.google.com/gsi/client + accounts.id.renderButton), thay cho nút tự vẽ
// trước đây. Google tự vẽ + tự cập nhật giao diện theo chuẩn thương hiệu của họ.
//
// Luồng: người dùng bấm nút Google vẽ ra -> Google trả về 1 ID token (JWT) qua callback JS
// (KHÔNG redirect) -> ta gửi token đó cho NextAuth qua CredentialsProvider "google-idtoken"
// (lib/auth.ts) để xác thực với Google và tạo phiên đăng nhập như bình thường.
//
// Nếu vì lý do gì đó script Google không tải được (mạng chặn, chưa cấu hình JS origin trong
// Google Cloud Console, v.v.) thì hiện lại nút dự phòng kiểu cũ (vẫn hoạt động qua luồng
// redirect signIn("google")) — không để người dùng bị kẹt không đăng nhập được.
import { useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

function GoogleIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

type GoogleCredentialResponse = { credential?: string };
type GoogleIdConfig = {
  client_id: string;
  callback: (res: GoogleCredentialResponse) => void;
  ux_mode?: "popup" | "redirect";
  auto_select?: boolean;
};
type GoogleButtonOptions = {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
};
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfig) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
        };
      };
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;
function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gsi-load-failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gsi-load-failed"));
    document.head.appendChild(s);
  });
  return scriptLoadPromise;
}

type Props = {
  callbackUrl: string;
  text: "signin_with" | "signup_with";
  fallbackLabel: string;
  fallbackClassName: string;
  fallbackIconClassName: string;
};

export default function GoogleIdentityButton({
  callbackUrl,
  text,
  fallbackLabel,
  fallbackClassName,
  fallbackIconClassName,
}: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [authError, setAuthError] = useState("");

  const handleCredential = useCallback(
    async (res: GoogleCredentialResponse) => {
      if (!res?.credential) return;
      setAuthError("");
      const result = await signIn("google-idtoken", { credential: res.credential, redirect: false });
      if (!result || result.error) {
        setAuthError("Đăng nhập Google thất bại — vui lòng thử lại");
        return;
      }
      router.push(callbackUrl);
    },
    [callbackUrl, router]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/google-client-id");
        const data = (await res.json()) as { clientId: string | null };
        if (cancelled) return;
        if (!data.clientId) {
          setStatus("unavailable");
          return;
        }
        await loadGsiScript();
        if (cancelled || !window.google || !containerRef.current) {
          if (!cancelled) setStatus("unavailable");
          return;
        }
        window.google.accounts.id.initialize({
          client_id: data.clientId,
          callback: handleCredential,
          ux_mode: "popup",
        });
        const width = Math.min(400, Math.max(220, containerRef.current.parentElement?.clientWidth ?? 320));
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "pill",
          logo_alignment: "center",
          locale: "vi",
          width,
        });
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("unavailable");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full">
      {status !== "unavailable" && (
        <div ref={containerRef} className="w-full flex justify-center" style={{ display: status === "ready" ? "flex" : "none" }} />
      )}
      {status === "loading" && <div className="w-full h-11 rounded-full bg-white/40 animate-pulse" />}
      {status === "unavailable" && (
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className={fallbackClassName}
        >
          <GoogleIcon className={fallbackIconClassName} />
          {fallbackLabel}
        </button>
      )}
      {authError && <p className="text-red-300 text-xs text-center mt-2">{authError}</p>}
    </div>
  );
}
