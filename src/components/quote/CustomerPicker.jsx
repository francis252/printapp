import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, Plus, User } from "lucide-react";

export default function CustomerPicker({ value, onChange }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", company: "" });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      onChange({ customer_name: created.name, customer_email: created.email, customer_company: created.company || "" });
      setCreating(false);
      setNewCustomer({ name: "", email: "", company: "" });
      setOpen(false);
    },
  });

  const handleSelect = (c) => {
    onChange({ customer_name: c.name, customer_email: c.email, customer_company: c.company || "" });
    setOpen(false);
  };

  const handleCreate = () => {
    if (!newCustomer.name || !newCustomer.email) return;
    createMutation.mutate(newCustomer);
  };

  const displayLabel = value?.customer_name
    ? `${value.customer_name}${value.customer_company ? ` — ${value.customer_company}` : ""}`
    : "Select customer...";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between font-normal"
        onClick={() => { setOpen(true); setCreating(false); }}
      >
        <span className="flex items-center gap-2 text-sm truncate">
          <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          {value?.customer_name ? displayLabel : <span className="text-muted-foreground">Select customer...</span>}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>

          {!creating ? (
            <div className="space-y-2">
              <div className="max-h-64 overflow-y-auto space-y-1">
                {customers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No customers yet.</p>
                )}
                {customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.email}{c.company ? ` · ${c.company}` : ""}</div>
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full gap-2 mt-2"
                onClick={() => setCreating(true)}
              >
                <Plus className="w-4 h-4" /> Create New Customer
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
                <Input value={newCustomer.name} onChange={(e) => setNewCustomer((p) => ({ ...p, name: e.target.value }))} placeholder="John Smith" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label>
                <Input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer((p) => ({ ...p, email: e.target.value }))} placeholder="john@example.com" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Company</label>
                <Input value={newCustomer.company} onChange={(e) => setNewCustomer((p) => ({ ...p, company: e.target.value }))} placeholder="Acme Corp" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setCreating(false)}>Back</Button>
                <Button
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={!newCustomer.name || !newCustomer.email || createMutation.isPending}
                >
                  {createMutation.isPending ? "Saving..." : "Save & Select"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}