// Sign-in (Auth.js + Google). The session lives in an encrypted cookie; the user's id is OUR
// database id (auth.users.id), looked up by email at sign-in, so people who signed up while the
// app was on Supabase keep their account and history.
import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { cache } from "react";
import { postgrest } from "@/lib/db/postgrest";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [Google],
  callbacks: {
    signIn({ account, profile }) {
      return account?.provider === "google" && !!profile?.email && profile.email_verified === true;
    },
    async jwt({ token, account, profile }) {
      // `account` is only present on the sign-in request itself.
      if (account && profile?.email) {
        const { data, error } = await postgrest("service_role").rpc("sign_in_user", {
          user_email: profile.email,
          meta: { full_name: profile.name, name: profile.name, avatar_url: profile.picture },
        });
        if (error || typeof data !== "string") {
          throw new Error(`sign_in_user failed: ${error?.message ?? "no id"}`);
        }
        token.uid = data;
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      return session;
    },
  },
});

export type SessionUser = { id: string; email: string | null; name: string | null; image: string | null };

/** The signed-in user, or null. Cached per request. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const user = (await auth())?.user;
  if (!user?.id) return null;
  return { id: user.id, email: user.email ?? null, name: user.name ?? null, image: user.image ?? null };
});
