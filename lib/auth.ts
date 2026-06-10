import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
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
    async jwt({ token, user, account, trigger }) {
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
      if (user && account?.provider === "credentials") {
        token.companyId = user.image;
        token.role = (user as { picture?: string }).picture ?? "admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as { companyId?: string; role?: string };
        u.companyId = token.companyId as string;
        u.role = token.role as string;
      }
      return session;
    },
  },
};
