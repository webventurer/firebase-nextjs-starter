"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { user, signOut } = useAuth();

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Signed in as {user?.email}
          </p>
        </div>
        <Button variant="outline" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
      <p className="text-muted-foreground">
        This is a protected route. Edit{" "}
        <code className="font-mono">src/app/(auth)/dashboard/page.tsx</code> to
        get started.
      </p>
    </main>
  );
}
