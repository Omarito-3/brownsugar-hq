import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SoundToggle } from "@/components/layout/sound-toggle";
import { SignOutButton } from "@/components/layout/sign-out-button";

export function MobileTopbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
      <span className="text-base font-semibold tracking-tight">
        Brown Sugar <span className="text-primary">HQ</span>
      </span>
      <div className="flex items-center gap-1">
        <SoundToggle />
        <ThemeToggle />
        <SignOutButton compact />
      </div>
    </header>
  );
}
