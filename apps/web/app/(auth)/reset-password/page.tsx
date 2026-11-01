import { redirect } from "next/navigation";

/**
 * AccountKit's reset links land on the sign-in page, which opens the step that
 * sets the new password. This address is kept for links and bookmarks that
 * still name it; a token from Kivvi's old reset mail is no longer valid there
 * and is answered with "request a new link".
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await searchParams;
  redirect(typeof token === "string" ? `/login?token=${encodeURIComponent(token)}` : "/login");
}
