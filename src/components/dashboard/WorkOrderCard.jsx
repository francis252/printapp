import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronDown, Download, Loader2, ArrowRight, CheckCircle2, Package, Factory, Check } from "lucide-react";
import { toast } from "sonner";

const STAGES = ["waiting_stock", "stock_received", "in_production", "finished"];

const STAGE_META = {
  waiting_stock:  { label: "Waiting for Stock",  icon: Package,     color: "bg-yellow-100 text-yellow-700 border-yellow-200",  dot: "bg-yellow-400" },
  stock_received: { label: "Stock Received",      icon: CheckCircle2, color: "bg-blue-100 text-blue-700 border-blue-200",       dot: "bg-blue-500"   },
  in_production:  { label: "In Production",       icon: Factory,      color: "bg-purple-100 text-purple-700 border-purple-200",  dot: "bg-purple-500" },
  finished:       { label: "Finished",            icon: Check,        color: "bg-green-100 text-green-700 border-green-200",     dot: "bg-green-500"  },
};

export default function WorkOrderCard({ wo }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const meta = STAGE_META[wo.stage] || STAGE_META.waiting_stock;
  const currentIdx = STAGES.indexOf(wo.stage);
  const nextStage = STAGES[currentIdx + 1];
  const nextMeta = nextStage ? STAGE_META[nextStage] : null;

  const advanceMutation = useMutation({
    mutationFn: (stage) => base44.entities.WorkOrder.update(wo.id, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      toast.success("Stage updated!");
    },
  });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await base44.functions.fetch("downloadWorkOrder", {
        method: "POST",
        body: JSON.stringify({ work_order_id: wo.id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `work-order-${wo.title.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Failed to download: " + e.message);
    }
    setDownloading(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-muted/30 transition-all"
        onClick={() => setExpanded((p) => !p)}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{wo.title}</p>
          <p className="text-xs text-muted-foreground truncate">{wo.customer_name}</p>
        </div>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${meta.color}`}>{meta.label}</span>
        {wo.total > 0 && <span className="text-sm font-bold shrink-0">${Number(wo.total).toFixed(2)}</span>}
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4 bg-muted/10">
          {/* Stage progress */}
          <div className="flex items-center gap-1">
            {STAGES.map((s, i) => {
              const sm = STAGE_META[s];
              const done = i <= currentIdx;
              return (
                <React.Fragment key={s}>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${done ? sm.color : "bg-muted text-muted-foreground border-border"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${done ? sm.dot : "bg-muted-foreground/30"}`} />
                    {sm.label}
                  </div>
                  {i < STAGES.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Line items */}
          {(wo.line_items || []).length > 0 && (
            <div className="space-y-2">
              {wo.line_items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-background rounded-xl border border-border px-3 py-2.5">
                  {item.product_image && (
                    <img src={item.product_image} alt="" className="w-10 h-10 object-contain rounded-lg border border-border bg-white shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.product_name}</p>
                    {item.color && <p className="text-xs text-muted-foreground">{item.color}</p>}
                    {item.size_breakdown && <p className="text-xs text-muted-foreground">{item.size_breakdown}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold">Qty: {item.quantity}</p>
                    <p className="text-xs text-muted-foreground">${Number(item.total || 0).toFixed(2)}</p>
                  </div>
                  {/* Mockup thumbnails */}
                  {item.mockup_images?.length > 0 && (
                    <div className="flex gap-1 shrink-0">
                      {item.mockup_images.slice(0, 3).map((m) => (
                        <div key={m.view} className="text-center">
                          <p className="text-[8px] text-muted-foreground mb-0.5">{m.view}</p>
                          <img src={m.url} alt={m.view} className="w-12 h-12 object-contain rounded-lg border border-border bg-white p-0.5" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {wo.notes && <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2"><strong>Notes:</strong> {wo.notes}</p>}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {nextStage && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => advanceMutation.mutate(nextStage)}
                disabled={advanceMutation.isPending}
              >
                {advanceMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                Move to: {nextMeta.label}
              </Button>
            )}
            {wo.stage === "finished" && (
              <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Order Complete</span>
            )}
            <Button size="sm" variant="outline" className="gap-1.5 ml-auto" onClick={handleDownload} disabled={downloading}>
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download Work Order
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}