import { useState, useCallback, useEffect } from "react";
import { useSiteSettings, useUpdateSetting } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { Save, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const WhatsAppSettingsTab = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const updateSetting = useUpdateSetting();
  const [local, setLocal] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!settings) return;
    const waSettings: Record<string, any> = {};
    settings.forEach((s) => {
      if (s.section === "whatsapp") waSettings[s.key] = s.value;
    });
    setLocal(waSettings);
  }, [settings]);

  const get = useCallback((key: string, fallback = "") => local[key] ?? fallback, [local]);
  const set = useCallback((key: string, value: any) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveAll = async () => {
    try {
      for (const [key, value] of Object.entries(local)) {
        await updateSetting.mutateAsync({ section: "whatsapp", key, value });
      }
      toast.success("WhatsApp settings saved!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;

  return (
    <Card>
      <CardHeader><CardTitle className="font-serif flex items-center gap-2"><MessageCircle className="h-5 w-5 text-[#25D366]" /> WhatsApp Contact</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1.5"><Label className="text-xs font-medium">WhatsApp Number</Label><Input value={(get("number", "+8801703396108") as string)} onChange={(e) => set("number", e.target.value)} className="h-9 text-xs" placeholder="+8801703396108" /><p className="text-xs text-muted-foreground">Include country code</p></div>
        <div className="space-y-1.5"><Label className="text-xs font-medium">Default Message</Label><Textarea value={(get("message", "Hello! I have a question.") as string)} onChange={(e) => set("message", e.target.value)} rows={2} className="text-xs" /></div>
        <Button onClick={saveAll} className="gap-2"><Save className="h-4 w-4" /> Save WhatsApp</Button>
      </CardContent>
    </Card>
  );
};

export default WhatsAppSettingsTab;
