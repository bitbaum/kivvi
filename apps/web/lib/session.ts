import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

/**
 * Get authenticated session or redirect to login.
 * Guarantees session.user.companyId is a string (not null).
 */
export async function getSessionOrRedirect() {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect("/login");
  }
  return session as Session & {
    user: Session["user"] & { companyId: string };
  };
}
