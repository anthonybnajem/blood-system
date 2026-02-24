"use client";

import { type Sale, type CustomerProfile } from "@/components/pos-data-provider";

export const WALK_IN_CUSTOMER_NAME = "Walk-in Customer";

export type CustomerSummary = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  defaultDiscountId?: string;
  totalSpent: number;
  purchaseCount: number;
  lastPurchase: Date;
  sales: Sale[];
  profileId?: string;
};

const createCustomerKey = ({
  name,
  email,
  phone,
  fallback,
}: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  fallback: string;
}) => {
  const normalizedPhone = phone?.replace(/\D/g, "") || "";
  return (
    email?.toLowerCase() ||
    (normalizedPhone ? `phone:${normalizedPhone}` : "") ||
    (name ? `name:${name.toLowerCase()}` : "") ||
    fallback
  );
};

const getIdentityKey = (name?: string | null, email?: string | null, phone?: string | null) => {
  const fallback =
    name && name !== WALK_IN_CUSTOMER_NAME
      ? `name:${name.toLowerCase()}`
      : "walk-in";
  return createCustomerKey({
    name,
    email,
    phone,
    fallback,
  });
};

export function buildCustomersFromSales(
  sales: Sale[],
  manualProfiles: CustomerProfile[] = []
): CustomerSummary[] {
  const map = new Map<string, CustomerSummary>();

  const hiddenKeys = new Set(
    manualProfiles
      .filter((profile) => profile.deleted)
      .map((profile) => getIdentityKey(profile.name, profile.email, profile.phone))
  );
  const activeProfiles = manualProfiles.filter((profile) => !profile.deleted);

  sales.forEach((sale) => {
    const key = getIdentityKey(sale.customerName, sale.customerEmail, sale.customerPhone);
    if (hiddenKeys.has(key)) {
      return;
    }
    const saleDate = new Date(sale.date);
    const existing = map.get(key);

    if (existing) {
      existing.totalSpent += sale.total;
      existing.purchaseCount += 1;
      existing.sales.push(sale);
      if (saleDate > existing.lastPurchase) {
        existing.lastPurchase = saleDate;
      }
      if (sale.customerEmail && !existing.email) {
        existing.email = sale.customerEmail;
      }
      if (sale.customerPhone && !existing.phone) {
        existing.phone = sale.customerPhone;
      }
      if (sale.customerLocation && !existing.location) {
        existing.location = sale.customerLocation;
      }
      if (sale.discountId && !existing.defaultDiscountId) {
        existing.defaultDiscountId = sale.discountId;
      }
    } else {
      map.set(key, {
        id: key,
        name: sale.customerName?.trim() || WALK_IN_CUSTOMER_NAME,
        email: sale.customerEmail || undefined,
        phone: sale.customerPhone || undefined,
        location: sale.customerLocation || undefined,
        totalSpent: sale.total,
        purchaseCount: 1,
        lastPurchase: saleDate,
        sales: [sale],
        defaultDiscountId: sale.discountId || undefined,
        profileId: undefined,
      });
    }
  });

  activeProfiles
    .filter((profile) => !profile.deleted)
    .forEach((profile) => {
    const key = createCustomerKey({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      fallback: `manual:${profile.id}`,
    });
    const existing = map.get(key);
    const lastUpdate =
      profile.updatedAt instanceof Date
        ? profile.updatedAt
        : new Date(profile.updatedAt);

    if (existing) {
      existing.id = profile.id;
      existing.profileId = profile.id;
      existing.name = profile.name || existing.name;
      existing.email = profile.email || existing.email;
      existing.phone = profile.phone || existing.phone;
      existing.location = profile.location || existing.location;
      existing.defaultDiscountId = profile.defaultDiscountId || existing.defaultDiscountId;
      if (existing.sales.length === 0) {
        existing.lastPurchase = lastUpdate;
      }
    } else {
      map.set(key, {
        id: profile.id,
        profileId: profile.id,
        name: profile.name || WALK_IN_CUSTOMER_NAME,
        email: profile.email || undefined,
        phone: profile.phone || undefined,
        location: profile.location || undefined,
        defaultDiscountId: profile.defaultDiscountId || undefined,
        totalSpent: 0,
        purchaseCount: 0,
        lastPurchase: lastUpdate,
        sales: [],
      });
    }
  });

  return Array.from(map.values())
    .map((customer) => ({
      ...customer,
      sales: [...customer.sales].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }))
    .sort(
      (a, b) => b.lastPurchase.getTime() - a.lastPurchase.getTime()
    );
}
