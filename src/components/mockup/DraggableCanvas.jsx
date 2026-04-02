import React, { useState } from "react";
import SingleViewCanvas from "./SingleViewCanvas";
import { Button } from "@/components/ui/button";

const VIEWS = ["Front", "Back", "Left", "Right"];
const LOGO_VIEW_MAP = { "Front": "Front", "Back": "Back", "Left": "Left Sleeve", "Right": "Right Sleeve" };

export default function DraggableCanvas({ views, activeView, onViewChange, selectedLogos, viewLogoSettings, onViewLogoSettingsChange, canvasRef, containerRefs }) {
  const [selectedViews, setSelectedViews] = useState(new Set(VIEWS));

  const toggleView = (view) => {
    const newSelected = new Set(selectedViews);
    if (newSelected.has(view)) {
      newSelected.delete(view);
    } else {
      newSelected.add(view);
    }
    setSelectedViews(newSelected);
  };

  const toggleAll = () => {
    if (selectedViews.size === VIEWS.length) {
      setSelectedViews(new Set());
    } else {
      setSelectedViews(new Set(VIEWS));
    }
  };

  const visibleViews = VIEWS.filter((v) => selectedViews.has(v));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Views:</span>
        <Button
          size="sm"
          variant={selectedViews.size === VIEWS.length ? "default" : "outline"}
          onClick={toggleAll}
          className="text-xs"
        >
          All
        </Button>
        {VIEWS.map((view) => (
          <Button
            key={view}
            size="sm"
            variant={selectedViews.has(view) ? "default" : "outline"}
            onClick={() => toggleView(view)}
            className="text-xs"
          >
            {view}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {visibleViews.map((view) => (
           <SingleViewCanvas
             key={view}
             view={view}
             imageUrl={views[view]}
             logoUrl={selectedLogos[LOGO_VIEW_MAP[view]]}
             logoSettings={viewLogoSettings[view]}
             onLogoSettingsChange={(settings) => onViewLogoSettingsChange(view, settings)}
             canvasRef={view === activeView ? canvasRef : null}
             containerRefCallback={(el) => { if (containerRefs) containerRefs.current[view] = el; }}
           />
         ))}
      </div>
    </div>
  );
}