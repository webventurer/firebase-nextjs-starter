import Link from "next/link";

// Layout for unauthenticated routes — login, signup, reset-password.
// Centred card-style chrome. Customise to match your brand.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <Link href="/" className="mb-8 text-2xl font-bold tracking-tight">
        Firebase Starter
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Your Company
      </p>
    </div>
  );
}
