import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Phone,
  Users,
  ChevronsUpDown,
  Plus,
  Minus,
  Percent,
} from "lucide-react";
import type { CustomerSummary } from "@/app/(dashboard)/customers/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandInput,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Discount } from "@/lib/db";

interface CustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerEmail: string;
  setCustomerEmail: (email: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  customerLocation: string;
  setCustomerLocation: (location: string) => void;
  saveCustomerInfo: () => void;
  existingCustomers?: CustomerSummary[];
  onSaveProfile?: (details: {
    name: string;
    email?: string;
    phone?: string;
    location?: string;
    defaultDiscountId?: string;
  }) => Promise<void>;
  availableDiscounts?: Discount[];
  onCustomerSelect?: (customer: CustomerSummary) => void;
}

export default function CustomerDialog({
  isOpen,
  onClose,
  customerName,
  setCustomerName,
  customerEmail,
  setCustomerEmail,
  customerPhone,
  setCustomerPhone,
  customerLocation,
  setCustomerLocation,
  saveCustomerInfo,
  existingCustomers = [],
  onSaveProfile,
  availableDiscounts = [],
  onCustomerSelect,
}: CustomerDialogProps) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileEmail, setNewProfileEmail] = useState("");
  const [newProfilePhone, setNewProfilePhone] = useState("");
  const [newProfileLocation, setNewProfileLocation] = useState("");
  const [newProfileDiscountId, setNewProfileDiscountId] = useState<
    string | undefined
  >(undefined);

  const handleSelectCustomer = (customer: CustomerSummary) => {
    setCustomerName(customer.name || "");
    setCustomerEmail(customer.email || "");
    setCustomerPhone(customer.phone || "");
    setCustomerLocation(customer.location || "");
    setIsSelectorOpen(false);
    onCustomerSelect?.(customer);
  };

  const openCreateProfile = () => {
    setNewProfileName(customerName || "");
    setNewProfileEmail(customerEmail || "");
    setNewProfilePhone(customerPhone || "");
    setNewProfileLocation(customerLocation || "");
    setNewProfileDiscountId(undefined);
    setIsCreatingProfile(true);
  };

  const handleCreateProfile = async () => {
    if (!onSaveProfile || !newProfileName.trim()) {
      setIsCreatingProfile(false);
      return;
    }

    try {
      setIsSavingProfile(true);
      await onSaveProfile({
        name: newProfileName.trim(),
        email: newProfileEmail.trim() || undefined,
        phone: newProfilePhone.trim() || undefined,
        location: newProfileLocation.trim() || undefined,
        defaultDiscountId: newProfileDiscountId || undefined,
      });
      setCustomerName(newProfileName.trim());
      setCustomerEmail(newProfileEmail.trim());
      setCustomerPhone(newProfilePhone.trim());
      setCustomerLocation(newProfileLocation.trim());
      setIsCreatingProfile(false);
      setIsSelectorOpen(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const selectedLabel =
    customerName ||
    customerEmail ||
    customerPhone ||
    customerLocation ||
    "Select customer";

  const hasSavedCustomers = existingCustomers.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customer Information</DialogTitle>
          <DialogDescription>
            Add customer details to this sale.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {(hasSavedCustomers || onSaveProfile) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Saved Customers
              </Label>
              <div className="flex items-center gap-2">
                <Link
                  href="/customers"
                  className="text-xs text-primary hover:underline"
                  onClick={onClose}
                >
                  Manage
                </Link>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    isCreatingProfile ? setIsCreatingProfile(false) : openCreateProfile()
                  }
                  title={isCreatingProfile ? "Cancel" : "Add new customer"}
                  disabled={!onSaveProfile}
                >
                  {isCreatingProfile ? (
                    <Minus className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            {hasSavedCustomers ? (
              <div className="flex items-center gap-2">
                <Popover open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isSelectorOpen}
                      className="flex-1 justify-between"
                    >
                      <span className="truncate text-left">{selectedLabel}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[360px] p-0">
                    <Command>
                      <CommandInput placeholder="Search by name, email, or phone" />
                      <CommandEmpty>No customers found.</CommandEmpty>
                      <CommandGroup>
                        {existingCustomers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={`${customer.name} ${customer.email ?? ""} ${customer.phone ?? ""} ${customer.location ?? ""}`}
                            onSelect={() => handleSelectCustomer(customer)}
                            className="flex flex-col items-start gap-0.5"
                          >
                            <span className="font-medium">{customer.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {customer.email ||
                                customer.phone ||
                                customer.location ||
                                "No contact data"}
                            </span>
                            {customer.defaultDiscountId && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Percent className="h-3 w-3" />
                                Discount assigned
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No saved customers yet. Use the plus icon to create one.
              </p>
            )}
        {isCreatingProfile && <div className="grid gap-2">
                  <Label htmlFor="new-profile-name">Create New Customer</Label>
                  </div>}
            {isCreatingProfile && (
              <div className="rounded-md border border-dashed p-3 space-y-2">
                <div className="grid gap-2">
                  <Label htmlFor="new-profile-name">Name</Label>
                  <Input
                    id="new-profile-name"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="Customer name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-profile-email">Email</Label>
                  <Input
                    id="new-profile-email"
                    type="email"
                    value={newProfileEmail}
                    onChange={(e) => setNewProfileEmail(e.target.value)}
                    placeholder="customer@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-profile-phone">Phone</Label>
                  <Input
                    id="new-profile-phone"
                    value={newProfilePhone}
                    onChange={(e) => setNewProfilePhone(e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-profile-location">Location</Label>
                  <Input
                    id="new-profile-location"
                    value={newProfileLocation}
                    onChange={(e) => setNewProfileLocation(e.target.value)}
                    placeholder="City / Address"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-profile-discount">Default Discount</Label>
                  <Select
                    value={newProfileDiscountId ?? "none"}
                    onValueChange={(value) =>
                      setNewProfileDiscountId(
                        value === "none" ? undefined : value
                      )
                    }
                  >
                    <SelectTrigger id="new-profile-discount">
                      <SelectValue placeholder="Choose discount" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No discount</SelectItem>
                      {availableDiscounts.length === 0 ? (
                        <SelectItem value="placeholder" disabled>
                          Create discounts to reuse them
                        </SelectItem>
                      ) : (
                        availableDiscounts.map((discount) => (
                          <SelectItem key={discount.id} value={discount.id}>
                            {discount.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreatingProfile(false)}
                    disabled={isSavingProfile}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateProfile}
                    disabled={
                      isSavingProfile || !newProfileName.trim() || !onSaveProfile
                    }
                  >
                    {isSavingProfile ? "Saving..." : "Save Customer"}
                  </Button>
                </div>
              </div>
            )}
          </div>
          )}
        
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveCustomerInfo}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
