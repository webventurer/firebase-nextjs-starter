import { Home } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg mx-auto text-center space-y-6">
        <h1 className="text-7xl font-bold tracking-tight">404</h1>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Page not found</h2>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has moved.
          </p>
        </div>
        <Link href="/" className={buttonVariants()}>
          <Home className="mr-2 h-4 w-4" />
          Back home
        </Link>
      </div>
    </div>
  );
}
