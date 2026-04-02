import React from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Move, Maximize, Sun } from "lucide-react";

export default function CanvasControls({ logoSettings, onSettingsChange }) {
  const update = (key, value) => onSettingsChange({ ...logoSettings, [key]: value });

  return (
    <div className="space-y-5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logo Settings</h3>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Maximize className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-xs font-medium flex-1">Size</Label>
          <span className="text-xs text-muted-foreground w-8 text-right">{logoSettings.scale}%</span>
        </div>
        <Slider
          value={[logoSettings.scale]}
          onValueChange={([v]) => update("scale", v)}
          min={5}
          max={100}
          step={1}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Move className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-xs font-medium flex-1">Horizontal</Label>
          <span className="text-xs text-muted-foreground w-8 text-right">{logoSettings.x}%</span>
        </div>
        <Slider
          value={[logoSettings.x]}
          onValueChange={([v]) => update("x", v)}
          min={0}
          max={100}
          step={1}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Move className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-xs font-medium flex-1">Vertical</Label>
          <span className="text-xs text-muted-foreground w-8 text-right">{logoSettings.y}%</span>
        </div>
        <Slider
          value={[logoSettings.y]}
          onValueChange={([v]) => update("y", v)}
          min={0}
          max={100}
          step={1}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sun className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-xs font-medium flex-1">Opacity</Label>
          <span className="text-xs text-muted-foreground w-8 text-right">{logoSettings.opacity}%</span>
        </div>
        <Slider
          value={[logoSettings.opacity]}
          onValueChange={([v]) => update("opacity", v)}
          min={10}
          max={100}
          step={1}
        />
      </div>
    </div>
  );
}