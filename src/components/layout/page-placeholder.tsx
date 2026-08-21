import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import type { LucideIcon } from "lucide-react";

export function PagePlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <FadeIn className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-6" />
            </span>
            Coming soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section hasn&apos;t been built yet. The navigation shell, auth, and data
            model are ready — {title.toLowerCase()} features will land here next.
          </p>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
