import React, { useState, useRef, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2, Upload, Trash2, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const VIEWS = ["Front", "Back", "Left Sleeve", "Right Sleeve"];

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default function ApprovalJobBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRefs = useRef({});

  const isNew = !id || id === "new";

  const { data: job, isLoading } = useQuery({
    queryKey: ["approval", id],
    queryFn: () => base44.entities.ApprovalJob.get(id),
    enabled: !isNew,
  });

  const [form, setForm] = useState({
    title: "",
    customer_name: "",
    customer_email: "",
    notes: "",
  });

  const [mockupImages, setMockupImages] = useState(
    VIEWS.map((v) => ({ view: v, url: "" }))
  );
  const [uploading, setUploading] = useState({});
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    if (job) {
      setForm({
        title: job.title || "",
        customer_name: job.customer_name || "",
        customer_email: job.customer_email || "",
        notes: job.notes || "",
      });
      if (job.mockup_images?.length) {
        setMockupImages(
          VIEWS.map((v) => {
            const existing = job.mockup_images.find((m) => m.view === v);
            return { view: v, url: existing?.url || "" };
          })
        );
      }
    }
  }, [job]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isNew) return base44.entities.ApprovalJob.create(data);
      return base44.entities.ApprovalJob.update(id, data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["approvals"] }),
  });

  const handleFileUpload = async (view, file) => {
    setUploading((p) => ({ ...p, [view]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setMockupImages((prev) => prev.map((m) => m.view === view ? { ...m, url: file_url } : m));
    setUploading((p) => ({ ...p, [view]: false }));
  };

  const handleRemoveImage = (view) => {
    setMockupImages((prev) => prev.map((m) => m.view === view ? { ...m, url: "" } : m));
  };

  const handleSave = async () => {
    const filledImages = mockupImages.filter((m) => m.url);
    const data = {
      ...form,
      mockup_images: filledImages,
      approval_token: job?.approval_token || generateToken(),
    };
    const saved = await saveMutation.mutateAsync(data);
    return saved;
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const saved = await handleSave();
      const jobId = isNew ? saved.id : id;
      await base44.functions.invoke("sendApprovalEmail", { job_id: jobId });
      toast.success("Approval email sent!");
      navigate("/dashboard");
    } catch (e) {
      toast.error("Failed to send: " + e.message);
    }
    setSending(false);
  };

  const handleSaveDraft = async () => {
    await handleSave();
    toast.success("Saved as draft");
    navigate("/dashboard");
  };

  if (!isNew && isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const alreadySent = job?.status === "sent" || job?.status === "approved" || job?.status === "denied";

  return (
    <div className="min-h-screen bg-background font-inter">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <h1 className="text-lg font-bold">{isNew ? "New Artwork Approval" : "Edit Artwork Approval"}</h1>
          {job?.status && (
            <span className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full ${
              job.status === "approved" ? "bg-green-100 text-green-700" :
              job.status === "denied" ? "bg-red-100 text-red-700" :
              job.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
            }`}>{job.status}</span>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Customer Info */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Customer Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Job Title</label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Spring 2026 T-Shirts" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer Name</label>
              <Input value={form.customer_name} onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))} placeholder="John Smith" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer Email</label>
              <Input type="email" value={form.customer_email} onChange={(e) => setForm((p) => ({ ...p, customer_email: e.target.value }))} placeholder="customer@example.com" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Internal Notes (optional)</label>
              <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any notes for the customer..." />
            </div>
          </div>
        </div>

        {/* Mockup Images */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">Mockup Images</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {mockupImages.map(({ view, url }) => (
              <div key={view} className="space-y-2">
                <p className="text-xs font-semibold text-center text-muted-foreground">{view}</p>
                {url ? (
                  <div className="relative aspect-square rounded-xl border border-border overflow-hidden bg-white">
                    <img src={url} alt={view} className="w-full h-full object-contain p-2" />
                    <button
                      onClick={() => handleRemoveImage(view)}
                      className="absolute top-1 right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRefs.current[view]?.click()}
                    className="w-full aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors"
                  >
                    {uploading[view] ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                    <span className="text-[10px] text-muted-foreground">Upload</span>
                  </button>
                )}
                <input
                  ref={(el) => (fileRefs.current[view] = el)}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && handleFileUpload(view, e.target.files[0])}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Tip: Use the Mockup Generator to create your images, then upload them here.</p>
        </div>

        {/* Customer response (if already responded) */}
        {(job?.status === "approved" || job?.status === "denied") && (
          <div className={`rounded-2xl p-5 border ${job.status === "approved" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <h2 className="font-semibold text-sm mb-1">{job.status === "approved" ? "✅ Customer Approved" : "❌ Customer Denied"}</h2>
            {job.customer_notes && <p className="text-sm text-muted-foreground">"{job.customer_notes}"</p>}
            {job.responded_at && <p className="text-xs text-muted-foreground mt-1">{new Date(job.responded_at).toLocaleString()}</p>}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleSaveDraft} disabled={sending || saveMutation.isPending}>
            Save Draft
          </Button>
          <Button onClick={handleSend} disabled={sending || alreadySent} className="gap-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {alreadySent ? "Already Sent" : "Send to Customer"}
          </Button>
        </div>
      </div>
    </div>
  );
}