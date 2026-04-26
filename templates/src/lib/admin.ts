// Admin authorisation via a comma-separated email whitelist in ADMIN_EMAILS.
// Storing admin status in env (not Firestore) prevents privilege escalation:
// nobody can promote themselves by writing to a user document.

const ADMIN_EMAILS: ReadonlySet<string> = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}
