import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md text-center border-2 border-border/50 shadow-xl">
        <CardContent className="pt-10 pb-10 flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 dark:text-red-400">
            <AlertTriangle className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter">
              404 Page Not Found
            </h1>
            <p className="text-muted-foreground">
              We couldn't find the page you were looking for. It might have been
              moved or deleted.
            </p>
          </div>

          <Link href="/">
            <Button size="lg" className="gap-2 font-semibold">
              Return Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
