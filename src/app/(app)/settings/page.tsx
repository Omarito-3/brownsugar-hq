import { Settings } from "lucide-react";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function SettingsPage() {
  return (
    <PagePlaceholder
      title="Settings"
      description="Account, appearance, and sound preferences."
      icon={Settings}
    />
  );
}
