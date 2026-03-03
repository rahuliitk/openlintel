import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, eq, users } from '@openlintel/db';
import { authConfig } from './auth.config';

/**
 * Full auth config with Drizzle adapter — Node.js only.
 * Used by Route Handlers and Server Components.
 */
const nextAuth = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.email) {
        // Ensure user exists in DB for credentials provider
        const existing = await db.query.users.findFirst({
          where: eq(users.email, user.email),
        });
        if (existing) {
          token.id = existing.id;
        } else {
          const [created] = await db
            .insert(users)
            .values({
              email: user.email,
              name: user.name ?? user.email.split('@')[0],
              image: user.image ?? null,
            })
            .returning();
          token.id = created.id;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized: authConfig.callbacks?.authorized,
  },
});

export const handlers = nextAuth.handlers;
export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
