import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';

/**
 * Auth config that can run in Edge Runtime (no Node.js-only imports).
 * Used by middleware for route protection.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        name: { label: 'Name', type: 'text', placeholder: 'Your Name' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const name = (credentials?.name as string) || email?.split('@')[0] || 'User';
        if (!email) return null;
        // Return a user object — the adapter will create if not exists
        return { id: email, email, name, image: null };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const protectedPrefixes = [
        '/dashboard',
        '/project',
        '/analytics',
        '/portfolios',
        '/marketplace',
        '/developer',
        '/notifications',
        '/admin',
      ];
      const isProtected = protectedPrefixes.some((p) =>
        nextUrl.pathname.startsWith(p),
      );
      const isAuthPage = nextUrl.pathname.startsWith('/auth');

      // Protected routes require login
      if (isProtected && !isLoggedIn) return false; // redirects to signIn page
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
  },
  session: { strategy: 'jwt' },
};
