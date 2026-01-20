import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import prisma from "./db";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    newUser: "/signup",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user && user.id) {
        token.id = user.id;
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
        token.tenantSlug = user.tenantSlug;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.tenantId = token.tenantId;
        session.user.tenantName = token.tenantName;
        session.user.tenantSlug = token.tenantSlug;
      }
      return session;
    },
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnAuth = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/signup");
      
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      } else if (isOnAuth) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { tenant: true },
        });

        if (!user) return null;

        const isValidPassword = await compare(password, user.password);
        if (!isValidPassword) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          tenantName: user.tenant.name,
          tenantSlug: user.tenant.slug,
        };
      },
    }),
  ],
});

// Extended types for NextAuth
declare module "next-auth" {
  interface User {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
  }
  interface Session {
    user: User & {
      id: string;
      tenantId: string;
      tenantName: string;
      tenantSlug: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
  }
}
