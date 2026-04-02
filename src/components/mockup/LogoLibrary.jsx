import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Trash2, Check } from "lucide-react";

const VIEWS = ["Front", "Back", "Left Sleeve", "Right Sleeve"];
const VIEW_LABELS = { Front: "F", Back: "B", "Left Sleeve": "L", "Right Sleeve": "R" };

export default function LogoLibrary({ selectedLogos, activeLogoView, onActiveLogoViewChange, onSelectLogo, sessionLogos = [], onSessionLogosChange, onClearLogo }) {
  const queryClient = useQueryClient();
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [logoName, setLogoName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  const setSessionLogos = (fn) => {
    if (typeof fn === "function") {
      onSessionLogosChange?.(fn(sessionLogos));
    } else {
      onSessionLogosChange?.(fn);
    }
  };

  const createLogoMutation = useMutation({
    mutationFn: (data) => base44.entities.Logo.create(data),
    onSuccess: (newLogo) => {
      // Ensure logo has id, name, and image_url
      const logoToAdd = {
        id: newLogo.id,
        name: newLogo.name,
        image_url: newLogo.image_url,
      };
      setSessionLogos((prev) => [logoToAdd, ...prev]);
      setShowNameInput(false);
      setLogoName("");
      setPendingFile(null);
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: (id) => base44.entities.Logo.delete(id),
    onSuccess: (_, deletedId) => {
      setSessionLogos((prev) => {
        const deleted = prev.find((logo) => logo.id === deletedId);
        if (deleted && onClearLogo) {
          // Clear this logo from all views where it's selected
          onClearLogo(deleted.image_url);
        }
        return prev.filter((logo) => logo.id !== deletedId);
      });
    },
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPendingFile(file_url);
    setLogoName(file.name.replace(/\.[^.]+$/, ""));
    setShowNameInput(true);
    setUploading(false);
  };

  const handleSaveLogo = () => {
    if (!logoName.trim() || !pendingFile) return;
    createLogoMutation.mutate({ name: logoName.trim(), image_url: pendingFile });
  };

  const currentSelectedUrl = selectedLogos?.[activeLogoView];

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logos</h3>
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/40 hover:bg-accent/50 transition-all"
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        {uploading ? (
          <Loader2 className="w-6 h-6 mx-auto text-primary animate-spin" />
        ) : (
          <>
            <Plus className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Click to upload</p>
          </>
        )}
      </div>



      {showNameInput && (
        <div className="flex gap-2 items-center">
          <Input
            value={logoName}
            onChange={(e) => setLogoName(e.target.value)}
            placeholder="Logo name"
            className="text-sm h-8"
            onKeyDown={(e) => e.key === "Enter" && handleSaveLogo()}
          />
          <Button size="sm" className="h-8 w-8 p-0" onClick={handleSaveLogo}>
            <Check className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {(!sessionLogos || sessionLogos.length === 0) ? (
        <p className="text-xs text-muted-foreground text-center py-4">No logos yet. Upload your first logo.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {sessionLogos.map((logo) => (
            <div
              key={logo.id || Math.random()}
              className={`group relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                currentSelectedUrl === logo.image_url
                  ? "border-primary shadow-md ring-2 ring-primary/20"
                  : "border-border hover:border-primary/30"
              }`}
              onClick={() => onSelectLogo(logo.image_url)}
            >
              <img src={logo.image_url} alt={logo.name} className="w-full h-full object-contain p-2 bg-white" crossOrigin="anonymous" />
              {logo.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteLogoMutation.mutate(logo.id); }}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-foreground/60 backdrop-blur-sm px-1.5 py-0.5">
                <p className="text-[10px] text-white truncate">{logo.name}</p>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* View selector */}
        <div className="flex gap-1">
        {VIEWS.map((view) => (
          <button
            key={view}
            onClick={() => onActiveLogoViewChange(view)}
            title={view}
            className={`flex-1 text-[10px] font-semibold py-1 rounded-md transition-all border ${
              activeLogoView === view
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-transparent hover:border-border"
            }`}
          >
            {VIEW_LABELS[view]}
            {selectedLogos?.[view] && activeLogoView !== view && (
              <span className="ml-0.5 w-1 h-1 rounded-full bg-green-500 inline-block align-middle" />
            )}
          </button>
        ))}
        </div>

        <p className="text-[10px] text-muted-foreground">
        Selecting a logo for: <span className="font-semibold text-foreground">{activeLogoView}</span>
        </p>
        </div>
        );
        }