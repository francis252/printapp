import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2, Plus, Trash2, ImageIcon, X, Search, Eye } from "lucide-react";
import { toast } from "sonner";
import MockupModal from "../components/quote/MockupModal";
import SSProductPicker from "../components/quote/SSProductPicker";
import CustomerPicker from "../components/quote/CustomerPicker";

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

const emptyItem = () => ({
  product_name: "", product_image: "", color: "", size_breakdown: "",
  quantity: 1, unit_price: 0, total: 0, mockup_images: []
});

export default function QuoteBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === "new";

  const { data: quote, isLoading } = useQuery({
    queryKey: ["quote", id],
    queryFn: () => base44.entities.Quote.get(id),
    enabled: !isNew,
  });

  const [form, setForm] = useState({
    title: "", customer_name: "", customer_email: "", customer_company: "", notes: "", tax_rate: 0,
  });
  const [lineItems, setLineItems] = useState([emptyItem()]);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  // which line item index has the mockup modal open (-1 = none)
  const [mockupModalIndex, setMockupModalIndex] = useState(-1);
  // which line item index has the SS picker open (-1 = none)
  const [ssPickerIndex, setSsPickerIndex] = useState(-1);

  useEffect(() => {
    if (quote) {
      setForm({
        title: quote.title || "",
        customer_name: quote.customer_name || "",
        customer_email: quote.customer_email || "",
        customer_company: quote.customer_company || "",
        notes: quote.notes || "",
        tax_rate: quote.tax_rate || 0,
      });
      if (quote.line_items?.length) setLineItems(quote.line_items);
    }
  }, [quote]);

  const updateItem = (i, field, value) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      if (field === "quantity" || field === "unit_price") {
        const qty = field === "quantity" ? Number(value) : Number(updated[i].quantity);
        const price = field === "unit_price" ? Number(value) : Number(updated[i].unit_price);
        updated[i].total = qty * price;
      }
      return updated;
    });
  };

  const handleSSProductSelect = ({ product_name, color, product_image }) => {
    if (ssPickerIndex < 0) return;
    setLineItems((prev) => {
      const updated = [...prev];
      updated[ssPickerIndex] = { ...updated[ssPickerIndex], product_name, color, product_image };
      return updated;
    });
  };

  const handleMockupSave = (images) => {
    if (mockupModalIndex < 0) return;
    setLineItems((prev) => {
      const updated = [...prev];
      updated[mockupModalIndex] = { ...updated[mockupModalIndex], mockup_images: images };
      return updated;
    });
  };

  const subtotal = lineItems.reduce((s, i) => s + Number(i.total || 0), 0);
  const taxAmount = subtotal * (Number(form.tax_rate) / 100);
  const total = subtotal + taxAmount;

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isNew) return base44.entities.Quote.create(data);
      return base44.entities.Quote.update(id, data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quotes"] }),
  });

  const handleSave = async () => {
    const data = {
      ...form,
      line_items: lineItems,
      subtotal,
      total,
      approval_token: quote?.approval_token || generateToken(),
    };
    return saveMutation.mutateAsync(data);
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const saved = await handleSave();
      const quoteId = isNew ? saved.id : id;
      await base44.functions.invoke("sendQuoteEmail", { quote_id: quoteId });
      toast.success("Quote sent to customer!");
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

  const handlePreviewEmail = async () => {
    setPreviewing(true);
    try {
      const saved = await handleSave();
      const quoteId = isNew ? saved.id : id;
      const me = await base44.auth.me();
      await base44.functions.invoke("sendQuoteEmail", { quote_id: quoteId, preview_to: me.email });
      toast.success(`Preview sent to ${me.email}!`);
    } catch (e) {
      toast.error("Failed to send preview: " + e.message);
    }
    setPreviewing(false);
  };

  if (!isNew && isLoading) return (
    <div className="flex justify-center items-center h-screen">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );

  const alreadySent = quote?.status === "sent" || quote?.status === "approved" || quote?.status === "denied";

  return (
    <>
      <div className="min-h-screen bg-background font-inter">
        <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <h1 className="text-lg font-bold">{isNew ? "New Quote" : "Edit Quote"}</h1>
            {quote?.status && (
              <span className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full ${
                quote.status === "approved" ? "bg-green-100 text-green-700" :
                quote.status === "denied" ? "bg-red-100 text-red-700" :
                quote.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
              }`}>{quote.status}</span>
            )}
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Customer Info */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Customer Info</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer</label>
              <CustomerPicker
                value={form}
                onChange={({ customer_name, customer_email, customer_company }) =>
                  setForm((p) => ({ ...p, customer_name, customer_email, customer_company }))
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                <Input value={form.customer_name} onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))} placeholder="John Smith" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                <Input type="email" value={form.customer_email} onChange={(e) => setForm((p) => ({ ...p, customer_email: e.target.value }))} placeholder="customer@example.com" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Company</label>
                <Input value={form.customer_company} onChange={(e) => setForm((p) => ({ ...p, customer_company: e.target.value }))} placeholder="Acme Corp" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Quote Title</label>
                <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Team Uniforms Spring 2026" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tax Rate (%)</label>
                <Input type="number" value={form.tax_rate} onChange={(e) => setForm((p) => ({ ...p, tax_rate: e.target.value }))} placeholder="0" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes (optional)</label>
                <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any notes for the customer..." />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Line Items</h2>
              <Button size="sm" variant="outline" onClick={() => setLineItems((p) => [...p, emptyItem()])} className="gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, i) => (
                <div key={i} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Product Name</label>
                      <div className="flex gap-2">
                        <Input value={item.product_name} onChange={(e) => updateItem(i, "product_name", e.target.value)} placeholder="e.g. Gildan 5000 T-Shirt" />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1.5 text-xs px-3"
                          onClick={() => setSsPickerIndex(i)}
                          title="Search S&S Activewear"
                        >
                          <Search className="w-3.5 h-3.5" /> S&amp;S
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Color</label>
                      <Input value={item.color} onChange={(e) => updateItem(i, "color", e.target.value)} placeholder="Black" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Size Breakdown</label>
                      <Input value={item.size_breakdown} onChange={(e) => updateItem(i, "size_breakdown", e.target.value)} placeholder="S:2, M:4, L:3" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Quantity</label>
                      <Input type="number" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} min="1" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Unit Price ($)</label>
                      <Input type="number" value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", e.target.value)} min="0" step="0.01" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Total</label>
                      <div className="h-9 flex items-center px-3 bg-muted rounded-lg text-sm font-semibold">${Number(item.total).toFixed(2)}</div>
                    </div>
                    <div className="flex items-end justify-end">
                      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive h-9 w-9"
                        onClick={() => setLineItems((p) => p.filter((_, idx) => idx !== i))}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Mockup section */}
                  <div className="border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Mockup</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-7"
                        onClick={() => setMockupModalIndex(i)}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        {item.mockup_images?.length > 0 ? "Edit Mockup" : "Add Mockup"}
                      </Button>
                    </div>

                    {item.mockup_images?.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {item.mockup_images.map((img) => (
                          <div key={img.view} className="relative group">
                            <div className="text-[10px] text-muted-foreground text-center mb-1">{img.view}</div>
                            <div className="relative">
                              <img
                                src={img.url}
                                alt={img.view}
                                className="w-16 h-16 object-contain rounded-lg border border-border bg-white"
                              />
                              <button
                                onClick={() => updateItem(i, "mockup_images", item.mockup_images.filter(m => m.view !== img.view))}
                                className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-border text-right space-y-1">
              <p className="text-sm text-muted-foreground">Subtotal: <span className="font-semibold text-foreground">${subtotal.toFixed(2)}</span></p>
              {Number(form.tax_rate) > 0 && (
                <p className="text-sm text-muted-foreground">Tax ({form.tax_rate}%): <span className="font-semibold text-foreground">${taxAmount.toFixed(2)}</span></p>
              )}
              <p className="text-lg font-bold text-foreground">Total: ${total.toFixed(2)}</p>
            </div>
          </div>

          {/* Customer Response */}
          {(quote?.status === "approved" || quote?.status === "denied") && (
            <div className={`rounded-2xl p-5 border ${quote.status === "approved" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <h2 className="font-semibold text-sm mb-1">{quote.status === "approved" ? "✅ Customer Approved" : "❌ Customer Denied"}</h2>
              {quote.customer_notes && <p className="text-sm text-muted-foreground">"{quote.customer_notes}"</p>}
              {quote.responded_at && <p className="text-xs text-muted-foreground mt-1">{new Date(quote.responded_at).toLocaleString()}</p>}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end flex-wrap">
            <Button variant="outline" onClick={handleSaveDraft} disabled={sending || saveMutation.isPending}>Save Draft</Button>
            <Button variant="outline" onClick={handlePreviewEmail} disabled={previewing || sending} className="gap-2">
              {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              {previewing ? "Sending preview..." : "Send Preview to My Email"}
            </Button>
            <Button onClick={handleSend} disabled={sending || alreadySent} className="gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {alreadySent ? "Already Sent" : "Send to Customer"}
            </Button>
          </div>
        </div>
      </div>

      {/* Mockup Modal */}
      {mockupModalIndex >= 0 && (
        <MockupModal
          onClose={() => setMockupModalIndex(-1)}
          onSave={handleMockupSave}
          initialImages={lineItems[mockupModalIndex]?.mockup_images || []}
          preloadImageUrl={lineItems[mockupModalIndex]?.product_image || null}
        />
      )}

      {/* S&S Product Picker */}
      <SSProductPicker
        open={ssPickerIndex >= 0}
        onClose={() => setSsPickerIndex(-1)}
        onSelect={handleSSProductSelect}
      />
    </>
  );
}