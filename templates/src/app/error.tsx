"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

// Global error boundary. Next.js renders this when a server or client component
// throws. Wire up your error tracking (Sentry, Datadog, etc.) inside useEffect.

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
    // Sentry.captureException(error)
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg mx-auto text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground">
            We hit an unexpected error. Try again or head back home.
          </p>
        </div>
        {process.env.NODE_ENV === "development" && (
          <pre className="text-left text-xs font-mono p-4 rounded-md bg-muted overflow-auto max-h-48">
            {error.name}: {error.message}
            {error.digest && `\nDigest: ${error.digest}`}
          </pre>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            <Home className="mr-2 h-4 w-4" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
