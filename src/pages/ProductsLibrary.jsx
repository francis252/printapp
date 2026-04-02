import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Package, ShoppingBag, Upload, ArrowLeft } from "lucide-react";
import CustomProductForm from "../components/products/CustomProductForm";
import CustomProductGrid from "../components/products/CustomProductGrid";
import SSProductBrowser from "../components/products/SSProductBrowser";
import SanMarProductBrowser from "../components/products/SanMarProductBrowser";
import PSRestfulProductBrowser from "../components/products/PSRestfulProductBrowser";
import ThemeToggle from "../components/ThemeToggle";

export default function ProductsLibrary() {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: customProducts = [] } = useQuery({
    queryKey: ["customProducts", currentUser?.email],
    queryFn: () => currentUser
      ? base44.entities.CustomProduct.filter({ created_by: currentUser.email }, "-created_date")
      : [],
    enabled: !!currentUser,
  });

  return (
    <div className="min-h-screen bg-background font-inter">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold">Products Library</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!showAddForm && (
              <Button onClick={() => setShowAddForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Custom Product
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {showAddForm && (
          <div className="mb-8">
            <CustomProductForm onClose={() => setShowAddForm(false)} />
          </div>
        )}

        <Tabs defaultValue="ss" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="ss" className="gap-2">
              <ShoppingBag className="w-4 h-4" /> S&S
            </TabsTrigger>
            <TabsTrigger value="sanmar" className="gap-2">
              <ShoppingBag className="w-4 h-4" /> SanMar
            </TabsTrigger>
            <TabsTrigger value="psrestful" className="gap-2">
              <ShoppingBag className="w-4 h-4" /> PSRestful
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-2">
              <Upload className="w-4 h-4" /> Custom
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ss" className="space-y-4">
            <SSProductBrowser onSelectImage={(url) => {
              navigate("/", { state: { imageUrl: url, imageView: "Front" } });
            }} />
          </TabsContent>

          <TabsContent value="sanmar" className="space-y-4">
            <SanMarProductBrowser onSelectImage={(url) => {
              navigate("/", { state: { imageUrl: url, imageView: "Front" } });
            }} />
          </TabsContent>

          <TabsContent value="psrestful" className="space-y-4">
            <PSRestfulProductBrowser onSelectImage={(view, url) => {
              navigate("/mockup", { state: { imageUrl: url, imageView: view } });
            }} />
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            {customProducts.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-2xl">
                <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">No custom products yet.</p>
              </div>
            ) : (
              <CustomProductGrid products={customProducts} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}