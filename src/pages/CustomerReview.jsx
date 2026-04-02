import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";

export default function CustomerReview() {
  const { token } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [decision, setDecision] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.entities.ApprovalJob.filter({ approval_token: token })
      .then((res) => { setJob(res?.[0] || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const handleDecision = async (d) => {
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("handleApprovalResponse", { token, decision: d, customer_notes: notes });
      if (res.data?.error) throw new Error(res.data.error);
      setDecision(d);
      setDone(true);
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!job) return (
    <div className="min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <p className="text-2xl font-bold mb-2">Link not found</p>
        <p className="text-muted-foreground">This approval link may have expired or is invalid.</p>
      </div>
    </div>
  );

  if (done || job.status === "approved" || job.status === "denied") {
    const finalDecision = decision || job.status;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          {finalDecision === "approve" || finalDecision === "approved" ? (
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold mb-2">
            {finalDecision === "approve" || finalDecision === "approved" ? "Artwork Approved!" : "Changes Requested"}
          </h1>
          <p className="text-muted-foreground">
            {finalDecision === "approve" || finalDecision === "approved"
              ? "Great! We've received your approval and will move forward with production."
              : "We've received your feedback and will revise the artwork shortly."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-inter">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Artwork Approval</h1>
          <p className="text-muted-foreground mt-1">Hi {job.customer_name}, please review your artwork below.</p>
          <h2 className="text-lg font-semibold mt-3">{job.title}</h2>
        </div>

        {/* Mockup images */}
        {job.mockup_images?.length > 0 && (
          <div className="flex flex-wrap gap-6 justify-center mb-8">
            {job.mockup_images.map((img) => (
              <div key={img.view} className="text-center">
                <p className="text-sm font-semibold text-muted-foreground mb-2">{img.view}</p>
                <img src={img.url} alt={img.view} className="max-w-[200px] rounded-xl border border-border shadow-sm bg-white p-2" />
              </div>
            ))}
          </div>
        )}

        {job.notes && (
          <div className="bg-muted rounded-xl p-4 mb-6">
            <p className="text-sm text-muted-foreground"><strong>Notes from us:</strong> {job.notes}</p>
          </div>
        )}

        {/* Notes input */}
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground block mb-2">Leave a note (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any comments or change requests..."
            className="w-full border border-input rounded-xl px-4 py-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && <p className="text-destructive text-sm mb-4">{error}</p>}

        {/* Approve / Deny */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="gap-2 bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none sm:px-10"
            onClick={() => handleDecision("approve")}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            Approve Artwork
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 border-red-300 text-red-600 hover:bg-red-50 flex-1 sm:flex-none sm:px-10"
            onClick={() => handleDecision("deny")}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-5 h-5" />}
            Request Changes
          </Button>
        </div>
      </div>
    </div>
  );
}