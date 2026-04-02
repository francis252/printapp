import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import SSCatalogModal from "./SSCatalogModal";

export default function SSBrowser({ onSelectImage }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => setOpen(true)}>
        <ShoppingBag className="w-3.5 h-3.5" />
        Browse S&S Catalog
      </Button>

      <SSCatalogModal open={open} onClose={() => setOpen(false)} onSelectImage={onSelectImage} />
    </>
  );
}