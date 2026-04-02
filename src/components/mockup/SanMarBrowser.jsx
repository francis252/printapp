import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import SanMarProductBrowser from "../products/SanMarProductBrowser";

export default function SanMarBrowser({ onSelectImage }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
          <ShoppingBag className="w-3.5 h-3.5" />
          Browse SanMar Catalog
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>SanMar Catalog</DialogTitle>
        </DialogHeader>
        <SanMarProductBrowser
          onSelectImage={(url, viewName) => {
            onSelectImage(viewName || "Front", url);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}