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

      // Google sign-in (first time) OR session update after company setup
      if (account?.provider === "google" || (trigger === "update" && token.email)) {
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
