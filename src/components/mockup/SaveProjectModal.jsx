import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function SaveProjectModal({ views, selectedLogos, viewLogoSettings, projectName, setProjectName, projectId, sessionLogos, onClose, canvasRef }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(projectName);
  const [saving, setSaving] = useState(false);



  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setSaving(true);

    let thumbnail = null;
    try {
      if (canvasRef?.current) {
        const canvas = await html2canvas(canvasRef.current, {
          useCORS: true,
          allowTaint: true,
          scale: 1,
          backgroundColor: "#ffffff",
        });
        const dataUrl = canvas.toDataURL("image/png");
        const blob = await fetch(dataUrl).then((r) => r.blob());
        const { file_url } = await base44.integrations.Core.UploadFile({ file: blob });
        thumbnail = file_url;
      }
    } catch (e) {
      // thumbnail is optional, continue without it
    }

    try {
      const projectData = {
        name: name.trim(),
        views,
        selected_logos: selectedLogos,
        view_logo_settings: viewLogoSettings,
        session_logos: sessionLogos,
        thumbnail,
      };

      if (projectId) {
        await base44.entities.Project.update(projectId, projectData);
      } else {
        await base44.entities.Project.create(projectData);
      }

      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project saved!");
      onClose();
      navigate("/");
    } catch (e) {
      toast.error("Failed to save project: " + e.message);
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Project Name</label>
            <Input
              placeholder="e.g., Team Uniforms Spring 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}