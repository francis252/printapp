import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, MessageSquare } from "lucide-react";
import { useParams } from "react-router-dom";

export default function CustomerQuoteReview() {
  const { token } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [decision, setDecision] = useState(null);
  const [error, setError] = useState(null);
  const [showDeclineForm, setShowDeclineForm] = useState(false);

  useEffect(() => {
    base44.functions.invoke("getQuoteByToken", { token })
      .then((res) => {
        setQuote(res.data?.quote || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const handleDecision = async (d) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("handleQuoteResponse", { token, decision: d, customer_notes: notes });
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

  if (!quote) return (
    <div className="min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <p className="text-2xl font-bold mb-2">Quote not found</p>
        <p className="text-muted-foreground">This link may have expired or is invalid.</p>
      </div>
    </div>
  );

  if (done || quote.status === "approved" || quote.status === "denied") {
    const finalDecision = decision || quote.status;
    const approved = finalDecision === "approve" || finalDecision === "approved";
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          {approved
            ? <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            : <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />}
          <h1 className="text-2xl font-bold mb-2">
            {approved ? "Quote Approved!" : "Quote Declined"}
          </h1>
          <p className="text-muted-foreground">
            {approved
              ? "We've received your approval and will be in touch shortly!"
              : "We've received your feedback and will reach out soon."}
          </p>
        </div>
      </div>
    );
  }

  const subtotal = Number(quote.subtotal || 0);
  const taxAmount = subtotal * (Number(quote.tax_rate || 0) / 100);
  const total = Number(quote.total || 0);

  return (
    <div className="min-h-screen bg-background font-inter">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Quote for Review</h1>
          <p className="text-muted-foreground mt-1">Hi {quote.customer_name}, please review your quote below.</p>
          <h2 className="text-lg font-semibold mt-3">{quote.title}</h2>
          {quote.customer_company && <p className="text-sm text-muted-foreground">{quote.customer_company}</p>}
        </div>

        {/* Line Items */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-muted-foreground font-medium">Product</th>
                <th className="px-4 py-3 text-center text-muted-foreground font-medium">Qty</th>
                <th className="px-4 py-3 text-right text-muted-foreground font-medium">Unit Price</th>
                <th className="px-4 py-3 text-right text-muted-foreground font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {(quote.line_items || []).map((item, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.product_image && (
                        <img src={item.product_image} alt="" className="w-10 h-10 object-contain rounded border border-border bg-white" />
                      )}
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        {item.color && <p className="text-xs text-muted-foreground">{item.color}</p>}
                        {item.size_breakdown && <p className="text-xs text-muted-foreground">{item.size_breakdown}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">${Number(item.unit_price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold">${Number(item.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border px-4 py-3 text-right space-y-1 bg-muted/30">
            <p className="text-sm text-muted-foreground">Subtotal: <strong className="text-foreground">${subtotal.toFixed(2)}</strong></p>
            {quote.tax_rate > 0 && <p className="text-sm text-muted-foreground">Tax ({quote.tax_rate}%): <strong className="text-foreground">${taxAmount.toFixed(2)}</strong></p>}
            <p className="text-lg font-bold text-foreground">Total: ${total.toFixed(2)}</p>
          </div>
        </div>

        {/* Mockups */}
        {(quote.line_items || []).some(item => item.mockup_images?.length > 0) && (
          <div className="mb-6 space-y-4">
            <h3 className="font-semibold text-sm">Artwork Mockups</h3>
            {(quote.line_items || []).filter(item => item.mockup_images?.length > 0).map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4">
                <p className="font-semibold text-sm mb-3">
                  {item.product_name || `Item ${i + 1}`}
                  {item.color && <span className="text-muted-foreground font-normal"> · {item.color}</span>}
                </p>
                <div className="flex flex-wrap gap-4">
                  {item.mockup_images.map((img) => (
                    <div key={img.view} className="text-center">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{img.view}</p>
                      <img src={img.url} alt={img.view} className="max-w-[140px] rounded-xl border border-border shadow-sm bg-white p-2" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notes from seller */}
        {quote.notes && (
          <div className="bg-muted rounded-xl p-4 mb-6">
            <p className="text-sm"><strong>Notes:</strong> {quote.notes}</p>
          </div>
        )}

        {error && <p className="text-destructive text-sm mb-4">{error}</p>}

        {/* Decline with changes form */}
        {showDeclineForm && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> What changes would you like?
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Describe the changes you'd like (e.g. different color, quantity adjustments, pricing concerns...)"
              className="w-full border border-input rounded-xl px-4 py-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <div className="flex gap-3 mt-3">
              <Button
                className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleDecision("deny")}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Submit &amp; Decline
              </Button>
              <Button variant="outline" onClick={() => setShowDeclineForm(false)} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showDeclineForm && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="gap-2 bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none sm:px-10"
              onClick={() => handleDecision("approve")}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Approve Quote
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-red-300 text-red-600 hover:bg-red-50 flex-1 sm:flex-none sm:px-10"
              onClick={() => handleDecision("deny")}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-5 h-5" />}
              Decline
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 flex-1 sm:flex-none sm:px-10"
              onClick={() => setShowDeclineForm(true)}
              disabled={submitting}
            >
              <MessageSquare className="w-5 h-5" />
              Decline with Changes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}