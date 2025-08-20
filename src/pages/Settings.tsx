import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdvancedSettingsManager } from "@/components/settings/AdvancedSettingsManager";

export default function Settings() {
  return (
    <div className="container mx-auto p-6">
      <AdvancedSettingsManager />
    </div>
  );
}