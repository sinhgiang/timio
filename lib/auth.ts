import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifySetupToken } from "@/lib/setupToken";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      // Nút "Sign in with Google" CHÍNH THỨC (Google Identity Services, renderButton phía
      // client) trả về một ID token (JWT) qua callback JS thay vì redirect OAuth thường —
      // provider này nhận token đó và xác thực với Google trước khi tạo phiên đăng nhập.
      // Vẫn dùng chung GoogleProvider phía trên cho ai muốn luồng redirect cũ.
      id: "google-idtoken",
      name: "Google",
      credentials: { credential: {} },
      async authorize(credentials) {
        if (!credentials?.credential) return null;
        // Xác thực chữ ký + hạn dùng ID token bằng endpoint chính thức của Google — đủ dùng
        // cho quy mô đăng nhập của SaaS này, không cần thêm thư viện xác thực JWT riêng.
        // https://developers.google.com/identity/sign-in/web/backend-auth
        let res: Response;
        try {
          res = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credentials.credential)}`
          );
        } catch {
          return null;
        }
        if (!res.ok) return null;
        const payload = (await res.json()) as {
          aud?: string;
          iss?: string;
          email?: string;
          email_verified?: string;
          name?: string;
          picture?: string;
          sub?: string;
        };
        const validIssuer = payload.iss === "accounts.google.com" || payload.iss === "https://accounts.google.com";
        if (!validIssuer || !payload.sub) return null;
        if (payload.aud !== process.env.GOOGLE_CLIENT_ID) return null;
        if (payload.email_verified !== "true" || !payload.email) return null;
        return { id: payload.sub, email: payload.email, name: payload.name ?? payload.email, image: payload.picture ?? null };
      },
    }),
    CredentialsProvider({
      id: "setup",
      name: "Setup",
      credentials: { email: {}, token: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.token) return null;
        if (!verifySetupToken(credentials.email, credentials.token)) return null;
        const admin = await prisma.admin.findUnique({
          where: { email: credentials.email },
          include: { company: true },
        });
        if (!admin) return null;
        return { id: admin.id, email: admin.email, name: admin.company.name, image: admin.companyId, picture: admin.role };
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const admin = await prisma.admin.findUnique({
          where: { email: credentials.email },
          include: { company: true },
        });

        if (!admin || !admin.password) return null;

        const passwordMatch = await bcrypt.compare(credentials.password, admin.password);
        if (!passwordMatch) return null;

        return {
          id: admin.id,
          email: admin.email,
          name: admin.company.name,
          image: admin.companyId,
          picture: admin.role,
          // branchId piggybacked via unused field — decoded in jwt callback
          phoneNumber: admin.branchId ?? "",
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn() {
      // Always allow sign-in — new Google users get companyId=null in JWT,
      // dashboard layout redirects them to /setup-company
      return true;
    },
    async jwt({ token, user, account, trigger, session: updateData }) {
      // Super admin impersonation: update({ impersonateCompanyId: id | null })
      if (trigger === "update" && updateData && typeof updateData === "object" && "impersonateCompanyId" in updateData) {
        const targetId = (updateData as Record<string, unknown>).impersonateCompanyId;
        if (targetId === null) {
          // Stop impersonation — restore original
          token.companyId = token.originalCompanyId ?? token.companyId;
          token.originalCompanyId = undefined;
          token.impersonating = false;
        } else {
          // Start impersonation — save original first
          if (!token.impersonating) token.originalCompanyId = token.companyId;
          token.companyId = targetId as string;
          token.impersonating = true;
        }
        return token; // skip DB lookup below
      }

      // Google sign-in (first time, qua redirect OR nút chính thức bằng ID token) OR session
      // update after company setup
      if (account?.provider === "google" || account?.provider === "google-idtoken" || (trigger === "update" && token.email)) {
        const admin = await prisma.admin.findUnique({
          where: { email: token.email! },
          include: { company: true },
        });
        if (admin) {
          token.companyId = admin.companyId;
          token.role = admin.role;
        }
      }
      // Credentials providers: "setup" (Google users) and "credentials" (email/password)
      if (user && (account?.provider === "setup" || account?.provider === "credentials")) {
        token.companyId = user.image;
        token.role = (user as { picture?: string }).picture ?? "admin";
        const br = (user as { phoneNumber?: string }).phoneNumber;
        token.branchId = br || null;
      }

      // JWT strategy nghĩa là companyId/role/branchId được "đóng băng" trong token lúc đăng nhập
      // và KHÔNG tự cập nhật lại — nếu admin đổi role/chi nhánh của ai đó (hoặc ta sửa qua DB),
      // người đó vẫn thấy quyền cũ cho tới khi đăng nhập lại. Để tránh lệch dữ liệu âm thầm,
      // định kỳ (tối đa 1 lần/phút mỗi phiên) đọc lại từ DB cho các request bình thường.
      if (!token.impersonating && token.email) {
        const lastChecked = (token.roleCheckedAt as number | undefined) ?? 0;
        if (Date.now() - lastChecked > 60_000) {
          const fresh = await prisma.admin.findUnique({
            where: { email: token.email as string },
            select: { companyId: true, role: true, branchId: true },
          });
          if (fresh) {
            token.companyId = fresh.companyId;
            token.role = fresh.role;
            token.branchId = fresh.branchId ?? null;
          }
          token.roleCheckedAt = Date.now();
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as { companyId?: string; role?: string; impersonating?: boolean; branchId?: string | null };
        u.companyId = token.companyId as string;
        u.role = token.role as string;
        u.impersonating = (token.impersonating as boolean) ?? false;
        u.branchId = (token.branchId as string | null) ?? null;
      }
      return session;
    },
  },
};
