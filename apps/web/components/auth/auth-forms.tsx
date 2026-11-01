"use client";

import Link from "next/link";
import {
  AccountPanel as SharedAccountPanel,
  PasswordRecoveryForm,
  SignInForm as SharedSignInForm,
  SignUpForm as SharedSignUpForm,
  type AuthClasses,
} from "@bitbaum/accountkit/auth/react";
// Types only: the runtime half of this entry point pulls in node:crypto.
import type { AuthLabels, SignInMethods } from "@bitbaum/accountkit/auth";
import type { ComponentProps } from "react";
import { authClient } from "@/lib/accountkit/client";

// A full-width label may be longer than a phone is wide ("Continue with
// Google, Apple, GitHub, X or Facebook"), so these buttons wrap.
const BUTTON =
  "inline-flex min-h-10 w-full items-center justify-center gap-2 whitespace-normal rounded-lg px-4 py-2 text-center text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

/** AccountKit's shared forms in Kivvi's look (components/ui). */
export const AUTH_CLASSES: Partial<AuthClasses> = {
  stack: "flex flex-col gap-4",
  field: "flex flex-col gap-1.5",
  label: "text-sm font-medium",
  input:
    "w-full rounded-lg border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20",
  hint: "text-xs text-muted-foreground",
  notice: "rounded-lg bg-muted p-3 text-sm",
  error: "rounded-lg bg-destructive/10 p-3 text-sm text-destructive",
  button: `${BUTTON} bg-primary text-primary-foreground hover:bg-primary/90`,
  buttonQuiet: `${BUTTON} border border-border-default bg-card text-foreground hover:bg-accent-muted`,
  link: "font-medium text-primary hover:underline",
  divider: "text-center text-xs text-muted-foreground",
  section: "flex flex-col gap-4 rounded-xl border bg-card p-6",
  sectionTitle: "font-semibold",
};

export const SIGN_IN_PATH = "/login";
export const SIGN_UP_PATH = "/register";

type Common = { labels: AuthLabels; methods: SignInMethods; next: string };

export function SignInForm({
  signUp,
  signUpHref = SIGN_UP_PATH,
  ...props
}: Common & { initialError: boolean; signUp: string; signUpHref?: string }) {
  return (
    <SharedSignInForm
      {...props}
      client={authClient}
      classes={AUTH_CLASSES}
      signInPath={SIGN_IN_PATH}
      signUpLink={
        <Link href={signUpHref} className="font-medium text-primary hover:underline">
          {signUp}
        </Link>
      }
    />
  );
}

export function SignUpForm({
  signIn,
  signInHref = SIGN_IN_PATH,
  ...props
}: Common & { signIn: string; signInHref?: string }) {
  return (
    <SharedSignUpForm
      {...props}
      client={authClient}
      classes={AUTH_CLASSES}
      signUpPath={SIGN_UP_PATH}
      signInPath={SIGN_IN_PATH}
      signInLink={
        <Link href={signInHref} className="font-medium text-primary hover:underline">
          {signIn}
        </Link>
      }
    />
  );
}

export function RecoveryForm(
  props: Pick<ComponentProps<typeof PasswordRecoveryForm>, "methods" | "next" | "labels">,
) {
  return (
    <PasswordRecoveryForm
      {...props}
      client={authClient}
      classes={AUTH_CLASSES}
      signInPath={SIGN_IN_PATH}
      onBack={() => window.location.assign(SIGN_IN_PATH)}
    />
  );
}

export function AccountPanel(
  props: Pick<
    ComponentProps<typeof SharedAccountPanel>,
    "user" | "linked" | "methods" | "accountPath" | "homePath" | "labels"
  >,
) {
  return <SharedAccountPanel {...props} client={authClient} classes={AUTH_CLASSES} />;
}
