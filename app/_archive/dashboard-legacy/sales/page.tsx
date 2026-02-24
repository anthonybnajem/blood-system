"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  usePosData,
  type Product,
  type CartItem,
  type Sale,
} from "@/components/pos-data-provider";
import { useDiscount } from "@/components/discount-provider";
import { Badge } from "@/components/ui/badge";
import { Tag, ShoppingCart } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { InvoicePrint } from "@/components/invoice-print";
import {
  ReceiptSettingsProvider,
  useReceiptSettings,
} from "@/components/receipt-settings-provider";
import DiscountDialog from "@/components/DiscountDialog";
import NotesDialog from "@/components/NotesDialog";
import CustomerDialog from "@/components/CustomerDialog";
import CheckoutDialog from "@/components/CheckoutDialog";
import { SearchBar } from "./components/SearchBar";
import { CategoryFilter } from "./components/CategoryFilter";
import { ProductTabs } from "./components/ProductTabs";
import { Cart } from "./components/Cart";
import { MobileCartButton } from "./components/MobileCartButton";
import { useBarcodeScanner } from "./hooks/useBarcodeScanner";
import { WeightQuantityDialog } from "./components/WeightQuantityDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsTablet } from "@/hooks/use-tablet";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatQuantityWithLabel,
  isWeightBased,
} from "@/lib/product-measurements";
import { Label } from "@/components/ui/label";
import {
  buildCustomersFromSales,
  type CustomerSummary,
} from "@/app/(dashboard)/customers/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function SalesPage() {
  const {
    products,
    categories,
    sales,
    customers,
    addCustomerProfile,
    recordSale,
    employees,
    shifts,
    getActiveShiftForEmployee,
  } = usePosData();
  const { settings } = useReceiptSettings();
  const { discounts } = useDiscount();
  const taxRate = settings?.taxRate || 0;
  const currencySymbol = settings?.currencySymbol || "$";
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerLocation, setCustomerLocation] = useState("");
  const [saleNotes, setSaleNotes] = useState("");
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    "percentage"
  );
  const [discountValue, setDiscountValue] = useState(0);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string | null>(
    null
  );
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [weightDialogProduct, setWeightDialogProduct] = useState<Product | null>(null);
  const customerDirectory = useMemo(
    () => buildCustomersFromSales(sales, customers),
    [sales, customers]
  );
  const selectedDiscount = useMemo(
    () =>
      selectedDiscountId
        ? discounts.find((discount) => discount.id === selectedDiscountId) ||
          null
        : null,
    [selectedDiscountId, discounts]
  );
  useEffect(() => {
    if (selectedDiscountId && !selectedDiscount) {
      setSelectedDiscountId(null);
    }
  }, [selectedDiscountId, selectedDiscount]);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const router = useRouter();
  const isTablet = useIsTablet();

  // Get active shift for selected employee (or first active shift)
  const activeShift = getActiveShiftForEmployee(
    selectedEmployeeId || undefined
  );

  // Get all active shifts for employee selection
  const activeShifts = shifts.filter((s) => s.status === "active");
  const activeEmployeesWithShifts = activeShifts.map((shift) => {
    const employee = employees.find((e) => e.id === shift.employeeId);
    return { shift, employee: employee || null };
  });

  // Use barcode scanner hook
  useBarcodeScanner({
    products,
    onScanProduct: (scannedProduct) => {
      if (isWeightBased(scannedProduct)) {
        openWeightDialog(scannedProduct);
        return;
      }
      addProductToCart(scannedProduct, 1);
    },
  });

  // Filter products based on search query and category
  useEffect(() => {
    // Always update searchResults when products change
    let filtered = [...products];

    // Apply category filter
    if (activeCategory !== "all") {
      filtered = filtered.filter(
        (product) => product.categoryId === activeCategory
      );
    }

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          (product.category?.name &&
            product.category.name.toLowerCase().includes(query)) ||
          (product.barcode && product.barcode.toLowerCase().includes(query)) ||
          (product.sku && product.sku.toLowerCase().includes(query)) ||
          (product.description &&
            product.description.toLowerCase().includes(query))
      );
    }

    // Always set searchResults, even if empty (to show empty state)
    setSearchResults(filtered);
  }, [searchQuery, activeCategory, products]);

  // Debug: Log when products or searchResults change
  useEffect(() => {
    console.log(
      "Products changed:",
      products.length,
      "Search results:",
      searchResults.length
    );
  }, [products, searchResults]);

  // Calculate cart subtotal
  const cartSubtotal = cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );
  const discountAnalysis = useMemo(() => {
    if (!selectedDiscount) {
      const manualBase =
        discountType === "percentage"
          ? cartSubtotal * (discountValue / 100)
          : discountValue;
      const manualAmount = Math.min(Math.max(manualBase, 0), cartSubtotal);
      return {
        amount: manualAmount,
        eligibleSubtotal: cartSubtotal,
        eligibleMatchCount: cart.length,
      };
    }

    let eligibleSubtotal = 0;
    let eligibleMatchCount = 0;
    let amount = 0;

    const applyLineDiscount = (lineTotal: number, quantity: number) => {
      if (lineTotal <= 0) return;
      eligibleSubtotal += lineTotal;
      eligibleMatchCount += 1;
      let lineDiscount =
        selectedDiscount.type === "percentage"
          ? lineTotal * (selectedDiscount.value / 100)
          : selectedDiscount.value * quantity;
      lineDiscount = Math.min(lineDiscount, lineTotal);
      amount += lineDiscount;
    };

    if (selectedDiscount.appliesTo === "product") {
      cart.forEach((item) => {
        if (selectedDiscount.productIds?.includes(item.product.id)) {
          applyLineDiscount(item.product.price * item.quantity, item.quantity);
        }
      });
    } else if (selectedDiscount.appliesTo === "category") {
      cart.forEach((item) => {
        if (
          item.product.categoryId &&
          selectedDiscount.categoryIds?.includes(item.product.categoryId)
        ) {
          applyLineDiscount(item.product.price * item.quantity, item.quantity);
        }
      });
    } else {
      applyLineDiscount(cartSubtotal, 1);
    }

    if (selectedDiscount.maxDiscount) {
      amount = Math.min(amount, selectedDiscount.maxDiscount);
    }

    const cappedAmount = Math.min(
      Math.max(amount, 0),
      eligibleSubtotal || cartSubtotal
    );

    return {
      amount: cappedAmount,
      eligibleSubtotal,
      eligibleMatchCount,
    };
  }, [
    cart,
    cartSubtotal,
    discountType,
    discountValue,
    selectedDiscount,
  ]);

  const {
    amount: computedDiscountAmount,
    eligibleSubtotal: eligibleDiscountSubtotal,
    eligibleMatchCount: eligibleDiscountMatches,
  } = discountAnalysis;

  const savedDiscountError = useMemo(() => {
    if (!selectedDiscount) return null;
    if (!selectedDiscount.isActive) {
      return "Discount is inactive";
    }
    const now = new Date();
    if (
      selectedDiscount.startDate &&
      new Date(selectedDiscount.startDate) > now
    ) {
      return "Discount not available yet";
    }
    if (selectedDiscount.endDate && new Date(selectedDiscount.endDate) < now) {
      return "Discount has expired";
    }
    if (
      selectedDiscount.usageLimit &&
      selectedDiscount.usageCount >= selectedDiscount.usageLimit
    ) {
      return "Usage limit reached";
    }
    if (
      (selectedDiscount.appliesTo === "product" ||
        selectedDiscount.appliesTo === "category") &&
      eligibleDiscountMatches === 0
    ) {
      return "This discount doesn't apply to items in the cart.";
    }
    const thresholdSubtotal =
      selectedDiscount.appliesTo === "product" ||
      selectedDiscount.appliesTo === "category"
        ? eligibleDiscountSubtotal
        : cartSubtotal;
    if (
      selectedDiscount.minOrderAmount &&
      thresholdSubtotal < selectedDiscount.minOrderAmount
    ) {
      return `Requires minimum order of ${currencySymbol}${selectedDiscount.minOrderAmount.toFixed(
        2
      )}`;
    }
    return null;
  }, [
    selectedDiscount,
    eligibleDiscountMatches,
    eligibleDiscountSubtotal,
    cartSubtotal,
    currencySymbol,
  ]);

  const discountAmount =
    selectedDiscount && savedDiscountError
      ? 0
      : computedDiscountAmount;

  // Calculate tax
  const taxAmount = (cartSubtotal - discountAmount) * (taxRate / 100);

  // Calculate total
  const cartTotal = cartSubtotal - discountAmount + taxAmount;
  const appliedDiscountLabel = useMemo(() => {
    if (selectedDiscount) {
      if (savedDiscountError) {
        return `${selectedDiscount.name} (not eligible)`;
      }
      const matchDetails =
        (selectedDiscount.appliesTo === "product" ||
          selectedDiscount.appliesTo === "category") &&
        eligibleDiscountMatches > 0
          ? `${eligibleDiscountMatches} matching item${
              eligibleDiscountMatches === 1 ? "" : "s"
            }`
          : null;
      return matchDetails
        ? `${selectedDiscount.name} (${matchDetails})`
        : selectedDiscount.name;
    }
    if (discountAmount > 0) {
      return discountType === "percentage"
        ? `${discountValue}% off`
        : `${currencySymbol}${discountValue.toFixed(2)} off`;
    }
    return undefined;
  }, [
    selectedDiscount,
    savedDiscountError,
    discountAmount,
    discountType,
    discountValue,
    currencySymbol,
    eligibleDiscountMatches,
  ]);
  const appliedDiscountId =
    selectedDiscount && !savedDiscountError ? selectedDiscount.id : undefined;
  const effectiveDiscountType =
    selectedDiscount && !savedDiscountError
      ? selectedDiscount.type
      : discountType;
  const effectiveDiscountValue =
    selectedDiscount && !savedDiscountError
      ? selectedDiscount.value
      : discountValue;

  // Calculate cart item count
  const cartItemCount = cart.length;

  // Add product to cart
  const addProductToCart = (product: Product, quantity = 1) => {
    if (product.stock <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is out of stock.`,
        variant: "destructive",
      });
      return;
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product.id === product.id
      );

      if (existingItem) {
        // Check if we have enough stock
        if (existingItem.quantity + quantity > product.stock) {
          toast({
            title: "Stock Limit Reached",
            description: `Only ${formatQuantityWithLabel(
              product,
              product.stock
            )} of ${product.name} available.`,
            variant: "destructive",
          });
          return prevCart;
        }

        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prevCart, { product, quantity }];
      }
    });

    // Show a toast notification
    toast({
      title: "Added to Cart",
      description: `${formatQuantityWithLabel(product, quantity)} of ${
        product.name
      } added to cart.`,
    });

    // Auto-open cart drawer on mobile when item is added
    if (isMobile && cart.length === 0) {
      setIsCartOpen(true);
    }
  };

  const openWeightDialog = (product: Product) => {
    if (product.stock <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is out of stock.`,
        variant: "destructive",
      });
      return;
    }
    setWeightDialogProduct(product);
  };

  const handleProductSelection = (product: Product) => {
    if (isWeightBased(product)) {
      openWeightDialog(product);
      return;
    }
    addProductToCart(product, 1);
  };

  // Update cart item quantity
  const updateQuantity = (productId: string, newQuantity: number) => {
    const product = products.find((p) => p.id === productId);

    if (product && newQuantity > product.stock) {
      toast({
        title: "Stock Limit Reached",
        description: `Only ${formatQuantityWithLabel(
          product,
          product.stock
        )} of ${product.name} available.`,
        variant: "destructive",
      });
      return;
    }

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.product.id !== productId)
    );
  };

  // Clear the entire cart
  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setSelectedDiscountId(null);
    setSaleNotes("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerLocation("");
    toast({
      title: "Cart Cleared",
      description: "All items have been removed from the cart.",
    });
  };

  // Handle checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to your cart before checkout.",
        variant: "destructive",
      });
      return;
    }

    // Validate active shift exists
    // if (!activeShift) {
    //   toast({
    //     title: "No Active Shift",
    //     description:
    //       "Please ensure an employee is clocked in before making a sale.",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    try {
      // Prepare the sale data with the format expected by IndexedDB
      const saleData = {
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          product: item.product,
        })),
        subtotal: cartSubtotal,
        tax: taxAmount,
        discount: discountAmount,
        discountType: effectiveDiscountType,
        discountId: appliedDiscountId,
        total: cartTotal,
        paymentMethod,
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerLocation: customerLocation.trim() || undefined,
        notes: saleNotes.trim() || undefined,
      };

      const sale = await recordSale(
        saleData,
        selectedEmployeeId || undefined,
        activeShift?.id
      );

      setCompletedSale(sale);
      setIsCheckoutOpen(false);
      setIsInvoiceOpen(true);
      setCart([]);
      setPaymentMethod("cash");
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setCustomerLocation("");
      setSaleNotes("");
      setDiscountValue(0);
      setSelectedDiscountId(null);
    } catch (error) {
      console.error("Error recording sale:", error);
      toast({
        title: "Error",
        description: "Failed to complete the sale. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Quick add functionality - directly add 1 quantity
  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (isWeightBased(product)) {
      openWeightDialog(product);
      return;
    }
    addProductToCart(product, 1);
  };

  const handleWeightConfirm = (quantity: number) => {
    if (!weightDialogProduct) return;
    addProductToCart(weightDialogProduct, quantity);
    setWeightDialogProduct(null);
  };

  const handleWeightDialogClose = () => {
    setWeightDialogProduct(null);
  };

  // Apply discount
  const applyDiscount = () => {
    setIsDiscountDialogOpen(false);

    if (selectedDiscount) {
      if (savedDiscountError) {
        toast({
          title: "Discount unavailable",
          description: savedDiscountError,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Discount Applied",
          description: `${selectedDiscount.name} is applied to this sale.`,
        });
      }
      return;
    }

    if (discountValue > 0) {
      toast({
        title: "Discount Applied",
        description: `${
          discountType === "percentage"
            ? discountValue + "%"
            : "$" + discountValue.toFixed(2)
        } discount applied to cart.`,
      });
    }
  };

  // Save notes
  const saveNotes = () => {
    setIsNotesDialogOpen(false);

    if (saleNotes.trim()) {
      toast({
        title: "Notes Saved",
        description: "Your notes have been saved to this sale.",
      });
    }
  };

  const handleSavedDiscountSelect = (discountId: string) => {
    setSelectedDiscountId(discountId);
  };

  const handleSavedDiscountClear = () => {
    setSelectedDiscountId(null);
  };

  const handleCustomerSelection = (customer: CustomerSummary) => {
    if (!customer.defaultDiscountId) return;
    const discountRecord = discounts.find(
      (discount) => discount.id === customer.defaultDiscountId
    );
    if (discountRecord) {
      setSelectedDiscountId(discountRecord.id);
      toast({
        title: "Customer Discount Applied",
        description: `Using ${discountRecord.name} for ${customer.name}.`,
      });
    } else {
      toast({
        title: "Discount unavailable",
        description: "This customer's discount could not be found.",
        variant: "destructive",
      });
      setSelectedDiscountId(null);
    }
  };

  // Save customer info
  const saveCustomerInfo = () => {
    setIsCustomerDialogOpen(false);

    if (customerName || customerEmail || customerPhone || customerLocation) {
      toast({
        title: "Customer Info Saved",
        description: "Customer information has been saved to this sale.",
      });
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <ReceiptSettingsProvider>
     
      <div
        className={`flex h-full w-full ${isMobile ? "flex-col" : "flex-row"} ${
          isTablet ? "gap-3" : "gap-4"
        } overflow-hidden min-w-0 p-4 md:p-6`}
      >
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top Bar with Search and Categories */}
          <div className="space-y-3 mb-4">
            {/* Cart Summary Bar with Sidebar Toggle */}
             
            <div
              className={`bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-lg ${
                isTablet ? "p-3" : "p-4"
              } border border-primary/20 shadow-sm`}
            >
              
              <div className="flex items-center justify-between gap-3">
                   <div className="p-2 rounded-lg flex items-center">
                         <SidebarTrigger className="h-9 w-9 shrink-0" />
                          <Button
                  variant="outline"
                  size="sm"
                  className="order-1"
                  onClick={() => router.push("/receipts")}
                >
                  View Recent Receipts
                </Button>
</div>
           
               
                {/* Active Shift Indicator / Employee Selector */}
                {activeShifts.length > 0 ? (
                  activeShifts.length === 1 ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-400">
                        {activeShifts[0].employeeId
                          ? employees.find(
                              (e) => e.id === activeShifts[0].employeeId
                            )?.name || "Shift Active"
                          : "Shift Active"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedEmployeeId}
                        onValueChange={setSelectedEmployeeId}
                      >
                        <SelectTrigger className="h-8 w-[180px] border-2 border-primary/20 bg-background">
                          <SelectValue placeholder="Select Employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeEmployeesWithShifts.map(
                            ({ shift, employee }) => (
                              <SelectItem
                                key={shift.id}
                                value={shift.employeeId}
                              >
                                {employee?.name || "Unknown"} - Active
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                ) : (
                  <div></div>
               
                  // <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/20">
                  //   <div className="h-2 w-2 rounded-full bg-destructive" />
                  //   <span className="text-xs font-medium text-destructive">
                  //     No Active Shift
                  //   </span>
                  // </div>
                )}
                
                
                <div className="flex items-center gap-3">
                 
                  <div className="flex items-center gap-2">
                   
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Cart Items
                      </p>
                      <p className="text-base font-semibold text-foreground">
                        {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
                      </p>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Tag className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold text-primary">
                        {currencySymbol}
                        {cartTotal.toFixed(2)}
                      </p>
                    </div>
                    
                  </div>
                  
                </div>
                
              </div>
              
            </div>

            {/* Search and Filter Section */}
            <div
              className={`bg-card rounded-lg ${
                isTablet ? "p-4" : "p-5"
              } shadow-sm border border-border`}
            >
              <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isTablet={isTablet}
              />

              {/* Horizontal Category Navigation */}
              <div className="mt-4">
                <CategoryFilter
                  categories={categories}
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                  isTablet={isTablet}
                />
              </div>
            </div>
          </div>

          {/* Products Grid with Tabs */}
            <ProductTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              searchResults={searchResults}
              products={products}
              searchQuery={searchQuery}
              activeCategory={activeCategory}
              currencySymbol={currencySymbol}
              onAddToCart={handleProductSelection}
              onQuickAdd={handleQuickAdd}
              containerVariants={containerVariants}
              itemVariants={itemVariants}
              isTablet={isTablet}
            />
        </div>

        {/* Cart Section - Desktop/Tablet: Sidebar, Mobile: Drawer */}
        {!isMobile && (
          <Cart
            cart={cart}
            cartItemCount={cartItemCount}
            cartSubtotal={cartSubtotal}
            discountValue={effectiveDiscountValue}
            discountType={effectiveDiscountType}
            discountAmount={discountAmount}
            discountLabel={appliedDiscountLabel}
            taxRate={taxRate}
            taxAmount={taxAmount}
            cartTotal={cartTotal}
            currencySymbol={currencySymbol}
            onClearCart={clearCart}
            onUpdateQuantity={updateQuantity}
            onRemoveFromCart={removeFromCart}
            onDiscountClick={() => setIsDiscountDialogOpen(true)}
            onNotesClick={() => setIsNotesDialogOpen(true)}
            onCustomerClick={() => setIsCustomerDialogOpen(true)}
            onCheckoutClick={() => setIsCheckoutOpen(true)}
            containerVariants={containerVariants}
            itemVariants={itemVariants}
            isMobile={false}
            isTablet={isTablet}
          />
        )}

        {/* Mobile Cart Drawer */}
        {isMobile && (
          <Cart
            cart={cart}
            cartItemCount={cartItemCount}
            cartSubtotal={cartSubtotal}
            discountValue={effectiveDiscountValue}
            discountType={effectiveDiscountType}
            discountAmount={discountAmount}
            discountLabel={appliedDiscountLabel}
            taxRate={taxRate}
            taxAmount={taxAmount}
            cartTotal={cartTotal}
            currencySymbol={currencySymbol}
            onClearCart={clearCart}
            onUpdateQuantity={updateQuantity}
            onRemoveFromCart={removeFromCart}
            onDiscountClick={() => setIsDiscountDialogOpen(true)}
            onNotesClick={() => setIsNotesDialogOpen(true)}
            onCustomerClick={() => setIsCustomerDialogOpen(true)}
            onCheckoutClick={() => setIsCheckoutOpen(true)}
            containerVariants={containerVariants}
            itemVariants={itemVariants}
            isMobile={true}
            isOpen={isCartOpen}
            onOpenChange={setIsCartOpen}
          />
        )}

        {/* Mobile Cart Button */}
        {isMobile && (
          <MobileCartButton
            cartItemCount={cartItemCount}
            cartTotal={cartTotal}
            currencySymbol={currencySymbol}
            onClick={() => setIsCartOpen(true)}
          />
        )}

        {/* Discount Dialog */}
        <DiscountDialog
          isOpen={isDiscountDialogOpen}
          onClose={() => setIsDiscountDialogOpen(false)}
          discountType={discountType}
          setDiscountType={setDiscountType}
          discountValue={discountValue}
          setDiscountValue={setDiscountValue}
          discountAmount={discountAmount}
          cartTotal={cartTotal}
          currencySymbol={currencySymbol}
          applyDiscount={applyDiscount}
          savedDiscounts={discounts}
          selectedDiscountId={selectedDiscountId}
          onSelectSavedDiscount={handleSavedDiscountSelect}
          onClearSavedDiscount={handleSavedDiscountClear}
          appliedDiscount={selectedDiscount}
          savedDiscountError={savedDiscountError}
        />

        {/* Notes Dialog */}
        <NotesDialog
          isOpen={isNotesDialogOpen}
          onClose={() => setIsNotesDialogOpen(false)}
          saleNotes={saleNotes}
          setSaleNotes={setSaleNotes}
          saveNotes={saveNotes}
        />

        {/* Customer Dialog */}
        <CustomerDialog
          isOpen={isCustomerDialogOpen}
          onClose={() => setIsCustomerDialogOpen(false)}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerEmail={customerEmail}
          setCustomerEmail={setCustomerEmail}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          customerLocation={customerLocation}
          setCustomerLocation={setCustomerLocation}
          saveCustomerInfo={saveCustomerInfo}
          existingCustomers={customerDirectory}
          availableDiscounts={discounts}
          onCustomerSelect={handleCustomerSelection}
          onSaveProfile={async ({
            name,
            email,
            phone,
            location,
            defaultDiscountId,
          }) => {
            const profile = await addCustomerProfile({
              name,
              email,
              phone,
              location,
              defaultDiscountId,
            });
            if (defaultDiscountId) {
              setSelectedDiscountId(defaultDiscountId);
            }
            toast({
              title: "Customer Saved",
              description: `${profile.name} is now available for future sales.`,
            });
          }}
        />

        {/* Checkout Dialog */}
        <CheckoutDialog
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          setIsCustomerDialogOpen={setIsCustomerDialogOpen}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          cartSubtotal={cartSubtotal}
          discountValue={effectiveDiscountValue}
          discountType={effectiveDiscountType}
          discountAmount={discountAmount}
          discountLabel={appliedDiscountLabel}
          taxRate={taxRate}
          taxAmount={taxAmount}
          cartTotal={cartTotal}
          currencySymbol={currencySymbol}
          handleCheckout={handleCheckout}
        />

        <WeightQuantityDialog
          product={weightDialogProduct}
          isOpen={Boolean(weightDialogProduct)}
          onClose={handleWeightDialogClose}
          onConfirm={handleWeightConfirm}
          currencySymbol={currencySymbol}
        />

        {/* Invoice Print Dialog */}
        {completedSale && (
          <InvoicePrint
            sale={completedSale}
            isOpen={isInvoiceOpen}
            onClose={() => setIsInvoiceOpen(false)}
          />
        )}
      </div>
    </ReceiptSettingsProvider>
  );
}
