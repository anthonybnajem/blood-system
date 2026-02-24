"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/image-upload";
import { Category, Product } from "@/lib/db";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import {
  DEFAULT_ITEM_INCREMENT,
  DEFAULT_ITEM_UNIT_LABEL,
  DEFAULT_WEIGHT_INCREMENT,
  DEFAULT_WEIGHT_UNIT_LABEL,
} from "@/lib/product-constants";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().min(0, "Price must be a positive number"),
  stock: z.number().min(0, "Stock must be a positive number"),
  categoryId: z.string().min(1, "Category is required"),
  barcode: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  sku: z.string().optional(),
  cost: z.number().min(0, "Cost must be a positive number").optional(),
  taxable: z.boolean().optional(),
  taxRate: z.number().min(0, "Tax rate must be a positive number").optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  saleType: z.enum(["item", "weight"]),
  unitLabel: z.string().min(1, "Unit label is required"),
  unitIncrement: z.number().positive("Quantity step must be greater than zero"),
  variations: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Variation name is required"),
        price: z.number().min(0, "Price must be a positive number"),
        stock: z.number().min(0, "Stock must be a positive number"),
      })
    )
    .optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface EditProductDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentProduct: Product | null;
  categories: Category[];
  handleEditProduct: (data: Product) => void;
}

export default function EditProductDialog({
  isOpen,
  onOpenChange,
  currentProduct,
  categories,
  handleEditProduct,
}: EditProductDialogProps) {
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [saleType, setSaleType] = useState<"item" | "weight">("item");

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      price: 0,
      stock: 0,
      categoryId: "",
      barcode: "",
      description: "",
      image: "",
      sku: "",
      cost: 0,
      taxable: false,
      taxRate: 0,
      tags: [],
      attributes: {},
      variations: [],
      saleType: "item",
      unitLabel: DEFAULT_ITEM_UNIT_LABEL,
      unitIncrement: DEFAULT_ITEM_INCREMENT,
    },
  });

  const {
    fields: variationFields,
    append: addVariation,
    remove: removeVariation,
    replace: replaceVariations,
  } = useFieldArray({
    control: form.control,
    name: "variations",
  });

  // used to remount Selects when options become available
  const categoryOptionsKey = useMemo(
    () => categories.map((c) => String(c.id)).join("|"),
    [categories]
  );

  /**
   * ✅ Reset when product changes
   */
  useEffect(() => {
    if (!currentProduct) return;

    const rawSaleType =
      currentProduct.saleType ;
    setSaleType(currentProduct.saleType);
    // alert(rawSaleType)
    const categoryId = String(
      currentProduct.categoryId ?? currentProduct.category?.id ?? ""
    );

    const unitLabel =
      currentProduct.unitLabel ||
      (rawSaleType === "weight"
        ? DEFAULT_WEIGHT_UNIT_LABEL
        : DEFAULT_ITEM_UNIT_LABEL);

    const unitIncrement =
      typeof currentProduct.unitIncrement === "number" &&
      currentProduct.unitIncrement > 0
        ? currentProduct.unitIncrement
        : rawSaleType === "weight"
        ? DEFAULT_WEIGHT_INCREMENT
        : DEFAULT_ITEM_INCREMENT;

    form.reset({
      ...currentProduct,
      saleType: rawSaleType,
      categoryId,
      unitLabel,
      unitIncrement,
      image: currentProduct.image || "",
      tags: currentProduct.tags || [],
      variations: currentProduct.variations || [],
    });

    replaceVariations(currentProduct.variations || []);
    setAttributes(currentProduct.attributes || {});
    form.setValue("saleType", rawSaleType);
  }, [currentProduct, currentProduct?.saleType]);

  // useEffect(() => {
  //   form.setValue("saleType", saleType);
  // }, [saleType, form]);

  /**
   * ✅ CRITICAL FIX:
   * When categories arrive, "poke" categoryId again so Radix Select matches an existing item.
   * This solves “placeholder even though value exists”.
   */
  useEffect(() => {
    if (!currentProduct) return;
    if (!categories || categories.length === 0) return;

    const categoryId = String(
      currentProduct.categoryId ?? currentProduct.category?.id ?? ""
    );

    const exists = categories.some((c) => String(c.id) === categoryId);

    if (exists) {
      // re-set same value to trigger Select to display it
      form.setValue("categoryId", categoryId, {
        shouldValidate: true,
        shouldDirty: false,
      });
    }
  }, [categoryOptionsKey, currentProduct?.id]);

  const onSubmit = (data: ProductFormValues) => {
    if (!currentProduct) return;
    handleEditProduct({
      ...currentProduct,
      ...data,
      categoryId: String(data.categoryId),
      attributes,
      image: data.image || "",
    });
  };

  if (!currentProduct) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Product</DialogTitle>
          <DialogDescription>
            Update the product details. All required fields are marked with an
            asterisk.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* NAME */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Product Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* PRICE / STOCK */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Price <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={Number.isFinite(field.value) ? field.value : 0}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Stock <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            value={Number.isFinite(field.value) ? field.value : 0}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* SALE TYPE */}
                <FormField
                defaultValue={saleType}
               
                  name="saleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selling Method {saleType}</FormLabel>
                      <Select
                        key={"saleType"}
                        value={saleType}
                        onValueChange={(v) => {
                          // alert(v)
                          if(!v) return;
                          const typed: "item" | "weight" =
                            v === "weight" ? "weight" : "item";
                          setSaleType(typed);
                          field.onChange(typed);

                          if (typed === "weight") {
                            form.setValue("unitLabel", DEFAULT_WEIGHT_UNIT_LABEL);
                            form.setValue("unitIncrement", DEFAULT_WEIGHT_INCREMENT);
                          } else {
                            form.setValue("unitLabel", DEFAULT_ITEM_UNIT_LABEL);
                            form.setValue("unitIncrement", DEFAULT_ITEM_INCREMENT);
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select selling method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent defaultValue={saleType}>
                          <SelectItem value="item">Per Item</SelectItem>
                          <SelectItem value="weight">By Weight</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose how quantities are captured for this product.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* UNIT LABEL / INCREMENT */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unitLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Label</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. unit, kg, gram"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unitIncrement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity Step</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.01"
                            value={Number.isFinite(field.value) ? field.value : 0}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* CATEGORY */}
                {/* {JSON.stringify(currentProduct)} */}
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Category <span className="text-destructive">*</span>
                      </FormLabel>

                      <Select
                        // ✅ this is the killer fix
                        // remount when categories list changes
                        key={currentProduct.id + "-category-" + categoryOptionsKey}
                        value={field.value ? String(field.value) : currentProduct.categoryId}
                        onValueChange={(v) => field.onChange(String(v))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* DESCRIPTION */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Product description"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* IMAGE */}
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Image</FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* DETAILS TAB (same as your old code) */}
              <TabsContent value="details" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Comma-separated tags"
                          value={
                            Array.isArray(field.value)
                              ? field.value.join(", ")
                              : ""
                          }
                          onChange={(e) => {
                            const tags = e.target.value
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean);
                            field.onChange(tags);
                          }}
                        />
                      </FormControl>
                      {Array.isArray(field.value) && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {field.value.map((tag, i) => (
                            <Badge key={i} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* ADVANCED TAB (shortened; keep your variations + attributes UI) */}
              <TabsContent value="advanced" className="space-y-4 mt-4">
                <FormItem>
                  <FormLabel>Custom Attributes</FormLabel>
                  <FormDescription>
                    Add custom key-value pairs for additional product information.
                  </FormDescription>

                  <div className="space-y-3">
                    {Object.entries(attributes).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex gap-2 p-3 border rounded-lg bg-muted/50"
                      >
                        <Input
                          value={key.replace("key-", "")}
                          readOnly
                          className="flex-1 bg-background"
                        />
                        <Input
                          value={value}
                          onChange={(e) =>
                            setAttributes((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder="Value"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setAttributes((prev) => {
                              const next = { ...prev };
                              delete next[key];
                              return next;
                            })
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setAttributes((prev) => ({
                          ...prev,
                          [`key-${Date.now()}`]: "",
                        }))
                      }
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Attribute
                    </Button>
                  </div>
                </FormItem>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
