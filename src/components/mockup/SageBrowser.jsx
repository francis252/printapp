import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import SageProductBrowser from "../products/SageProductBrowser";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SageBrowser({ onSelectImage }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="w-full justify-start gap-2"
      >
        <ShoppingBag className="w-4 h-4" />
        Browse Sage Products
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sage Products</DialogTitle>
          </DialogHeader>
          <SageProductBrowser
            onSelectImage={(url, label) => {
              onSelectImage("Front", url);
              setIsOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}