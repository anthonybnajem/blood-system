"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { useReceiptSettings } from "@/components/receipt-settings-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ImageUpload } from "@/components/image-upload";
import { Loader2, Save, RefreshCw, Printer, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ReceiptContent } from "@/components/receipt-content";
import { getReceiptStyles } from "@/lib/receipt-print";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { DEFAULT_RECEIPT_SETTINGS } from "@/lib/db";

export function ReceiptDesigner() {
  const { settings, isLoading, updateSettings } = useReceiptSettings();
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();


  const [formData, setFormData] = useState({
    storeName: "",
    storeAddress: "",
    storePhone: "",
    storeEmail: "",
    storeWebsite: "",
    storeLogo: "",
    logoSize: 100,
    showLogo: true,
    taxRate: 0,
    showTax: true,
    currency: "USD",
    currencySymbol: "$",
    footerText: "",
    headerText: "",
    showDiscounts: true,
    showItemizedTax: true,
    printAutomatically: false,
    receiptWidth: 300,
    fontSize: 12,
    fontFamily: "Arial",
    thankYouMessage: "",
    returnPolicy: "",
    showBarcode: false, // Add this field
    showInstagramQr: false,
    instagramUrl: "https://www.instagram.com/carnico.lb/",
  });

  // Update form data when settings change
  useEffect(() => {
    if (settings) {
      setFormData({
        storeName: settings.storeName || "",
        storeAddress: settings.storeAddress || "",
        storePhone: settings.storePhone || "",
        storeEmail: settings.storeEmail || "",
        storeWebsite: settings.storeWebsite || "",
        storeLogo: settings.storeLogo || "",
        showLogo: settings.showLogo,
        logoSize: settings.logoSize || 100,
        taxRate: settings.taxRate,
        showTax: settings.showTax,
        currency: settings.currency,
        currencySymbol: settings.currencySymbol,
        footerText: settings.footerText || "",
        headerText: settings.headerText || "",
        showDiscounts: settings.showDiscounts,
        showItemizedTax: settings.showItemizedTax,
        printAutomatically: settings.printAutomatically,
        receiptWidth: settings.receiptWidth,
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        thankYouMessage: settings.thankYouMessage || "",
        returnPolicy: settings.returnPolicy || "",
        showBarcode: settings.showBarcode !== undefined ? settings.showBarcode : false, // Add this field
        showInstagramQr: settings.showInstagramQr !== undefined ? settings.showInstagramQr : false,
        instagramUrl: settings.instagramUrl || "",


      });
    }
  }, [settings]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const normalizedValue =
      name === "taxRate" || name === "logoSize" || name === "receiptWidth" || name === "fontSize"
        ? Number(value) || 0
        : value;
    setFormData((prev) => ({ ...prev, [name]: normalizedValue }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSliderChange = (name: string, value: number[]) => {
    setFormData((prev) => ({ ...prev, [name]: value[0] }));
  };

  const handleImageChange = (value: string) => {
    setFormData((prev) => ({ ...prev, storeLogo: value }));
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      await updateSettings(formData);
      toast({
        title: "Settings Saved",
        description: "Your receipt design has been saved successfully",
      });
    } catch (error) {
      console.error("Failed to save receipt settings:", error);
      toast({
        title: "Error",
        description: "Failed to save receipt settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await updateSettings(DEFAULT_RECEIPT_SETTINGS);
      setFormData({
        storeName: DEFAULT_RECEIPT_SETTINGS.storeName || "",
        storeAddress: DEFAULT_RECEIPT_SETTINGS.storeAddress || "",
        storePhone: DEFAULT_RECEIPT_SETTINGS.storePhone || "",
        storeEmail: DEFAULT_RECEIPT_SETTINGS.storeEmail || "",
        storeWebsite: DEFAULT_RECEIPT_SETTINGS.storeWebsite || "",
        storeLogo: DEFAULT_RECEIPT_SETTINGS.storeLogo || "",
        showLogo: DEFAULT_RECEIPT_SETTINGS.showLogo,
        logoSize: DEFAULT_RECEIPT_SETTINGS.logoSize || 100,
        taxRate: DEFAULT_RECEIPT_SETTINGS.taxRate,
        showTax: DEFAULT_RECEIPT_SETTINGS.showTax,
        currency: DEFAULT_RECEIPT_SETTINGS.currency,
        currencySymbol: DEFAULT_RECEIPT_SETTINGS.currencySymbol,
        footerText: DEFAULT_RECEIPT_SETTINGS.footerText || "",
        headerText: DEFAULT_RECEIPT_SETTINGS.headerText || "",
        showDiscounts: DEFAULT_RECEIPT_SETTINGS.showDiscounts,
        showItemizedTax: DEFAULT_RECEIPT_SETTINGS.showItemizedTax,
        printAutomatically: DEFAULT_RECEIPT_SETTINGS.printAutomatically,
        receiptWidth: DEFAULT_RECEIPT_SETTINGS.receiptWidth,
        fontSize: DEFAULT_RECEIPT_SETTINGS.fontSize,
        fontFamily: DEFAULT_RECEIPT_SETTINGS.fontFamily,
        thankYouMessage: DEFAULT_RECEIPT_SETTINGS.thankYouMessage || "",
        returnPolicy: DEFAULT_RECEIPT_SETTINGS.returnPolicy || "",
        showBarcode: DEFAULT_RECEIPT_SETTINGS.showBarcode ?? false,
        showInstagramQr: DEFAULT_RECEIPT_SETTINGS.showInstagramQr ?? false,
        instagramUrl: DEFAULT_RECEIPT_SETTINGS.instagramUrl || "",
      });
      toast({
        title: "Receipt settings reset",
        description: "Receipt designer settings were restored to defaults.",
      });
    } catch (error) {
      console.error("Failed to reset receipt settings:", error);
      toast({
        title: "Reset failed",
        description: "Could not reset receipt settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrintPreview = async () => {
    if (!receiptRef.current) {
      toast({
        title: "Print Error",
        description: "No receipt content available.",
        variant: "destructive",
      });
      return;
    }

    let receiptContainer: HTMLDivElement | null = null;

    try {
      setIsPrinting(true);
      toast({
        title: "Preparing Print",
        description: "Generating a printable preview...",
      });

      const originalReceipt = receiptRef.current;
      const receiptClone = originalReceipt.cloneNode(true) as HTMLElement;

      receiptContainer = document.createElement("div");
      const measuredWidth =
        originalReceipt.getBoundingClientRect().width ||
        originalReceipt.offsetWidth ||
        originalReceipt.scrollWidth ||
        0;

      receiptContainer.style.position = "fixed";
      receiptContainer.style.left = "0";
      receiptContainer.style.top = "0";
      receiptContainer.style.width = `${measuredWidth}px`;
      receiptContainer.style.zIndex = "-1";
      receiptContainer.style.pointerEvents = "none";
      receiptContainer.style.opacity = "0";
      receiptContainer.style.backgroundColor = "#ffffff";
      receiptContainer.style.margin = "0";
      receiptContainer.style.padding = "0";

      receiptClone.style.maxHeight = "none";
      receiptClone.style.height = "auto";
      receiptClone.style.overflow = "visible";
      receiptClone.style.width = "100%";
      receiptClone.style.margin = "0 auto";

      const captureStyles = document.createElement("style");
      captureStyles.textContent = getReceiptStyles(formData, ".pdf-capture");

      receiptContainer.classList.add("pdf-capture");
      receiptContainer.appendChild(captureStyles);
      receiptContainer.appendChild(receiptClone);
      document.body.appendChild(receiptContainer);

      const canvas = await html2canvas(receiptClone, {
        scale: 2,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: -window.scrollY,
        useCORS: true,
        windowWidth: receiptClone.scrollWidth,
        windowHeight: receiptClone.scrollHeight,
      });

      const imageData = canvas.toDataURL("image/png");
      const pxToPt = (px: number) => (px * 72) / 96;
      const contentWidth = pxToPt(canvas.width);
      const contentHeight = pxToPt(canvas.height);
      const marginPx = 18;
      const margin = pxToPt(marginPx);
      const pageWidth = contentWidth + margin * 2;
      const pageHeight = contentHeight + margin * 2;
      const orientation = pageWidth > pageHeight ? "landscape" : "portrait";

      const pdf = new jsPDF({
        orientation,
        unit: "pt",
        format: [pageWidth, pageHeight],
      });

      pdf.addImage(
        imageData,
        "PNG",
        margin,
        margin,
        contentWidth,
        contentHeight,
        undefined,
        "FAST"
      );

      pdf.autoPrint();
      pdf.output("dataurlnewwindow");

      toast({
        title: "Preview Ready",
        description: "The receipt preview has been opened in a print window.",
      });
    } catch (error) {
      console.error("Print preview failed:", error);
      toast({
        title: "Print Failed",
        description: "Unable to generate the receipt preview.",
        variant: "destructive",
      });
    } finally {
      if (receiptContainer?.parentNode) {
        receiptContainer.parentNode.removeChild(receiptContainer);
      }
      setIsPrinting(false);
    }
  };


  // Sample receipt data for preview
  const sampleItems = [
    { name: "Product 1", quantity: 2, price: 10.99 },
    { name: "Product 2", quantity: 1, price: 24.99 },
    { name: "Product 3", quantity: 3, price: 5.99 },
  ];

  const subtotal = sampleItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = subtotal * (formData.taxRate / 100);
  const previewDiscount = subtotal * 0.1;
  const total = subtotal - previewDiscount + tax;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading receipt settings...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Settings Panel */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Receipt Designer</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={isSaving}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="header">Header</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="footer">Footer</TabsTrigger>
          </TabsList>

          <Card>
            <CardContent className="pt-6">
              <TabsContent value="general" className="space-y-4">
                {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="receiptWidth">Receipt Width (px)</Label>
                    <Slider
                      id="receiptWidth"
                      min={200}
                      max={500}
                      step={10}
                      value={[formData.receiptWidth]}
                      onValueChange={(value) =>
                        handleSliderChange("receiptWidth", value)
                      }
                    />
                    <div className="text-right text-sm text-muted-foreground">
                      {formData.receiptWidth}px
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fontSize">Font Size (px)</Label>
                    <Slider
                      id="fontSize"
                      min={8}
                      max={16}
                      step={1}
                      value={[formData.fontSize]}
                      onValueChange={(value) =>
                        handleSliderChange("fontSize", value)
                      }
                    />
                    <div className="text-right text-sm text-muted-foreground">
                      {formData.fontSize}px
                    </div>
                  </div>
                </div> */}

                {/* <div className="space-y-2">
                  <Label htmlFor="fontFamily">Font Family</Label>
                  <Select
                    value={formData.fontFamily}
                    onValueChange={(value) =>
                      handleSelectChange("fontFamily", value)
                    }
                  >
                    <SelectTrigger id="fontFamily">
                      <SelectValue placeholder="Select font family" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Courier New">Courier New</SelectItem>
                      <SelectItem value="Times New Roman">
                        Times New Roman
                      </SelectItem>
                      <SelectItem value="Verdana">Verdana</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      handleSelectChange("currency", value)
                    }
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* <SelectItem value="KHR">Cambodian Riel (KHR)</SelectItem> */}
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                        <SelectItem value="LL">Lebanese Lira (L.L)</SelectItem>
                      {/* <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                      <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
                      <SelectItem value="AUD">
                        Australian Dollar (AUD)
                      </SelectItem> */}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currencySymbol">Currency Symbol</Label>
                  <Input
                    id="currencySymbol"
                    name="currencySymbol"
                    value={formData.currencySymbol}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    name="taxRate"
                    type="number"
                    value={formData.taxRate}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="printAutomatically">
                    Print Automatically After Sale
                  </Label>
                  <Switch
                    id="printAutomatically"
                    checked={formData.printAutomatically}
                    onCheckedChange={(checked) =>
                      handleSwitchChange("printAutomatically", checked)
                    }
                  />
                </div>
              </TabsContent>

              <TabsContent value="header" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input
                    id="storeName"
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headerText">Header Text</Label>
                  <Input
                    id="headerText"
                    name="headerText"
                    value={formData.headerText}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storeAddress">Store Address</Label>
                  <Textarea
                    id="storeAddress"
                    name="storeAddress"
                    value={formData.storeAddress}
                    onChange={handleInputChange}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="storePhone">Phone Number</Label>
                    <Input
                      id="storePhone"
                      name="storePhone"
                      value={formData.storePhone}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="storeEmail">Email</Label>
                    <Input
                      id="storeEmail"
                      name="storeEmail"
                      value={formData.storeEmail}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storeWebsite">Website</Label>
                  <Input
                    id="storeWebsite"
                    name="storeWebsite"
                    value={formData.storeWebsite}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="showLogo">Show Logo</Label>
                      {/* <Label className="text-sm" htmlFor="showLogo">Coming Soon!</Label> */}
                    <Switch
                    
                      id="showLogo"
                      checked={formData.showLogo}
                      onCheckedChange={(checked) =>
                        handleSwitchChange("showLogo", checked)
                      }
                    />
                  </div>
                  {formData.showLogo && (
                    <ImageUpload
                      value={formData.storeLogo}
                      onChange={handleImageChange}
                      label="Store Logo"
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showTax">Show Tax Information</Label>
                  <Switch
                    id="showTax"
                    checked={formData.showTax}
                    onCheckedChange={(checked) =>
                      handleSwitchChange("showTax", checked)
                    }
                  />
                </div>

                {/* <div className="flex items-center justify-between">
                  <Label htmlFor="showItemizedTax">Show Itemized Tax</Label>
                  <Switch
                    id="showItemizedTax"
                    checked={formData.showItemizedTax}
                    onCheckedChange={(checked) =>
                      handleSwitchChange("showItemizedTax", checked)
                    }
                  />
                </div> */}

                <div className="flex items-center justify-between">
                  <Label htmlFor="showDiscounts">Show Discounts</Label>
                       {/* <Label className="text-sm" htmlFor="showDiscounts">Coming Soon!</Label> */}
                  <Switch
                  
                    id="showDiscounts"
                    checked={formData.showDiscounts}
                    onCheckedChange={(checked) =>
                      handleSwitchChange("showDiscounts", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="showBarcode">Show Barcode</Label>
                    <Label className="text-sm ml-3" htmlFor="showDiscounts">Coming Soon!</Label>
                  <Switch
                  disabled
                    id="showBarcode"
                    checked={formData.showBarcode}
                    onCheckedChange={(checked) =>
                      handleSwitchChange("showBarcode", checked)
                    }
                  />
                </div>
              </TabsContent>

              <TabsContent value="footer" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="thankYouMessage">Thank You Message</Label>
                  <Input
                    id="thankYouMessage"
                    name="thankYouMessage"
                    value={formData.thankYouMessage}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="returnPolicy">Return Policy</Label>
                  <Textarea
                    id="returnPolicy"
                    name="returnPolicy"
                    value={formData.returnPolicy}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footerText">Footer Text</Label>
                  <Textarea
                    id="footerText"
                    name="footerText"
                    value={formData.footerText}
                    onChange={handleInputChange}
                    rows={2}
                  />
              
                </div>
                <div className="space-y-2">
  <Label htmlFor="instagramUrl">Instagram URL</Label>
  <Input
    id="instagramUrl"
    name="instagramUrl"
    value={formData.instagramUrl}
    onChange={handleInputChange}
    placeholder="https://www.instagram.com/yourhandle/"
  />
</div>

<div className="flex items-center justify-between">
  <Label htmlFor="showInstagramQr">Show Instagram QR</Label>
  <Switch
    id="showInstagramQr"
    checked={formData.showInstagramQr}
    onCheckedChange={(checked) =>
      handleSwitchChange("showInstagramQr", checked)
    }
  />
</div>
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>

      {/* Receipt Preview */}
      <div className="w-full lg:w-96">
        <div className="sticky top-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Receipt Preview</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="mr-2 h-4 w-4" />
                {previewMode ? "Edit Mode" : "Preview Mode"}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrintPreview}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </div>

          <div
            className={`border rounded-lg p-4 bg-white text-black overflow-auto max-h-[70vh] transition-all ${
              previewMode ? "shadow-lg" : ""
            }`}
            style={{
              width: previewMode ? `${formData.receiptWidth}px` : "100%",
              maxWidth: "100%",
              fontFamily: formData.fontFamily,
              fontSize: `${formData.fontSize}px`,
              margin: previewMode ? "0 auto" : "",
            }}
          >
            <ReceiptContent
              ref={receiptRef}
              data={formData}
              receiptId={`INV-${Math.floor(Math.random() * 100000)}-${new Date().getTime()}`}
              item={sampleItems}
              subtotal={subtotal}
              discount={{ amount: previewDiscount, label: "Sample Discount" }}
              tax={tax}
              total={total}
              meta={{
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                customerName: "Walk-in Customer",
                paymentMethod: "Cash",
              }}
            />


  


          </div>

        </div>
      </div>
    </div>
  );
}
