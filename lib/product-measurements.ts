import type { Product } from "./db";
import {
  DEFAULT_ITEM_INCREMENT,
  DEFAULT_ITEM_UNIT_LABEL,
  DEFAULT_WEIGHT_INCREMENT,
  DEFAULT_WEIGHT_UNIT_LABEL,
  type ProductSaleType,
} from "./product-constants";

export function getSaleType(product?: Product | null): ProductSaleType {
  return product?.saleType === "weight" ? "weight" : "item";
}

export function isWeightBased(product?: Product | null): boolean {
  return getSaleType(product) === "weight";
}

export function getUnitLabel(product?: Product | null): string {
  const saleType = getSaleType(product);
  const label = product?.unitLabel?.trim();
  if (label) {
    return label;
  }
  return saleType === "weight"
    ? DEFAULT_WEIGHT_UNIT_LABEL
    : DEFAULT_ITEM_UNIT_LABEL;
}

export function getUnitIncrement(product?: Product | null): number {
  const saleType = getSaleType(product);
  const increment = product?.unitIncrement;
  if (increment && increment > 0) {
    return increment;
  }
  return saleType === "weight"
    ? DEFAULT_WEIGHT_INCREMENT
    : DEFAULT_ITEM_INCREMENT;
}

export function formatMeasurementValue(
  value: number,
  maxDecimals = 3
): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(maxDecimals).replace(/\.?0+$/, "");
}

export function formatQuantityWithLabel(
  product?: Product | null,
  quantity = 0
): string {
  const formatted = formatMeasurementValue(quantity);
  return `${formatted} ${getUnitLabel(product)}`.trim();
}

export function formatStockDisplay(product?: Product | null): string {
  const formatted = formatMeasurementValue(product?.stock ?? 0);
  if (isWeightBased(product)) {
    return `${formatted} ${getUnitLabel(product)}`.trim();
  }
  return formatted;
}
