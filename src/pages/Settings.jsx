import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Check, Upload, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const SETTING_KEYS = ["notify_email", "brand_color", "company_name", "company_logo_url"];

export default function Settings() {
  const queryClient = useQueryClient();
  const [vals, setVals] = useState({ notify_email: "", brand_color: "#4f46e5", company_name: "", company_logo_url: "" });
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  useEffect(() => {
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    setVals(prev => ({
      notify_email: map.notify_email || prev.notify_email,
      brand_color: map.brand_color || prev.brand_color,
      company_name: map.company_name || prev.company_name,
      company_logo_url: map.company_logo_url || prev.company_logo_url,
    }));
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const map = {};
      settings.forEach(s => { map[s.key] = s; });
      for (const key of SETTING_KEYS) {
        if (map[key]) {
          await base44.entities.AppSettings.update(map[key].id, { value: vals[key] });
        } else if (vals[key]) {
          await base44.entities.AppSettings.create({ key, value: vals[key] });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      setSaved(true);
      toast.success("Settings saved!");
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setVals(prev => ({ ...prev, company_logo_url: file_url }));
      toast.success("Logo uploaded!");
    } catch {
      toast.error("Upload failed");
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-background font-inter">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">

        {/* Branding */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-base mb-1">Company Branding</h2>
            <p className="text-sm text-muted-foreground">Your logo and colors appear on quotes sent to customers.</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Company Name</label>
            <Input
              value={vals.company_name}
              onChange={(e) => setVals(prev => ({ ...prev, company_name: e.target.value }))}
              placeholder="Your Print Shop Name"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Company Logo</label>
            <div className="flex items-center gap-4">
              {vals.company_logo_url && (
                <img src={vals.company_logo_url} alt="Logo" className="h-16 w-auto max-w-[160px] object-contain rounded-lg border border-border bg-white p-1" />
              )}
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" className="gap-2 pointer-events-none" disabled={uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Uploading..." : "Upload Logo"}
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
              {vals.company_logo_url && (
                <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => setVals(prev => ({ ...prev, company_logo_url: "" }))}>Remove</button>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Brand Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={vals.brand_color}
                onChange={(e) => setVals(prev => ({ ...prev, brand_color: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5 bg-background"
              />
              <Input
                value={vals.brand_color}
                onChange={(e) => setVals(prev => ({ ...prev, brand_color: e.target.value }))}
                placeholder="#4f46e5"
                className="w-32"
              />
              <div className="flex-1 h-8 rounded-lg border border-border" style={{ background: vals.brand_color }} />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-base mb-1">Notification Email</h2>
            <p className="text-sm text-muted-foreground">Where to send alerts when customers approve or decline.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Email</label>
            <Input
              type="email"
              value={vals.notify_email}
              onChange={(e) => setVals(prev => ({ ...prev, notify_email: e.target.value }))}
              placeholder="you@yourcompany.com"
            />
          </div>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2 w-full"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved!" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}