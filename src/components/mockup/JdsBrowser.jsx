import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import JdsProductBrowser from "../products/JdsProductBrowser";

export default function JdsBrowser({ onSelectImage }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <ShoppingBag className="w-4 h-4" />
          Browse JDS Products
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select JDS Product</DialogTitle>
        </DialogHeader>
        <JdsProductBrowser
          onSelectImage={(url, productName) => {
            onSelectImage(url);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}