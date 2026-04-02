import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PSRestfulProductBrowser from "../products/PSRestfulProductBrowser";

export default function PSRestfulBrowser({ onSelectImage }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs" onClick={() => setOpen(true)}>
        <img src="https://psrestful.com/favicon.ico" alt="" className="w-4 h-4" onError={e => e.target.style.display='none'} />
        Browse PSRestful (500+ Suppliers)
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>PSRestful Product Browser</DialogTitle>
          </DialogHeader>
          <PSRestfulProductBrowser
            onSelectImage={(view, url) => {
              onSelectImage(view, url);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}