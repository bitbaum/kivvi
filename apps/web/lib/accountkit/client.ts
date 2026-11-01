"use client";
/**
 * The browser client for AccountKit's screens (SignInForm, SignUpForm,
 * PasswordRecoveryForm, AccountPanel). Pages that only read who is signed in
 * keep `useSession` from next-auth/react (lib/accountkit/compat.ts).
 */
import { createAuthClient } from "better-auth/react";
import { authClientPlugins } from "@bitbaum/accountkit/auth/client";

export const authClient = createAuthClient({ plugins: authClientPlugins() });
