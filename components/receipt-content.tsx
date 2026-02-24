import React, { forwardRef } from "react";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";

interface ReceiptContentProps {
  data: {
    showLogo: boolean;
    storeLogo?: string;
    storeName: string;
    fontSize: number;
    logoSize?: number;
    headerText?: string;
    storeAddress?: string;
    storePhone?: string;
    storeEmail?: string;
    storeWebsite?: string;
    currencySymbol: string;
    showTax: boolean;
    showDiscounts?: boolean;
    taxRate: number;
    thankYouMessage?: string;
    returnPolicy?: string;
    footerText?: string;
    showBarcode: boolean;
    showInstagramQr: boolean;
    instagramUrl?: string;
  };
  item: {
    name: string;
    quantity: number;
    quantityDisplay?: string;
    price: number;
    total?: number;
  }[];
  receiptId: string;
  subtotal: number;
  discount?: {
    amount: number;
    label?: string;
  };
  tax: number;
  total: number;
  meta?: {
    date?: string;
    time?: string;
    customerName?: string;
    paymentMethod?: string;
  };
}

export const ReceiptContent = forwardRef<HTMLDivElement, ReceiptContentProps>(
  ({ data, item, subtotal, discount, tax, total, receiptId, meta }, ref) => {
    const now = new Date();
    const displayDate = meta?.date || now.toLocaleDateString();
    const displayTime = meta?.time || now.toLocaleTimeString();
    const displayCustomer = meta?.customerName || "";
    const displayPayment = meta?.paymentMethod || "Credit Card";

    return (
      <>
        <div ref={ref}>
          <div className="receipt-header text-center">
            {data.showLogo && (
              <img
                src={data.storeLogo || "/placeholder.svg"}
                alt="Store Logo"
                className="receipt-logo mb-2"
                style={{
                  maxWidth: `${data.logoSize || 100}px`,
                  maxHeight: `${data.logoSize || 100}px`,
                  display: "block",
                  margin: "0 auto",
                  objectFit: "contain",
                }}
                crossOrigin="anonymous"
              />
            )}
            <h1
              className="text-center font-bold"
              style={{ fontSize: `${data.fontSize + 4}px` }}
            >
              {data.storeName}
            </h1>
            {data.headerText && (
              <p className="text-center">{data.headerText}</p>
            )}
            {data.storeAddress && (
              <p className="text-center text-sm">Address: {data.storeAddress}</p>
            )}
            {data.storePhone && (
              <p className="text-center text-sm">Phone: {data.storePhone}</p>
            )}
            {data.storeEmail && (
              <p className="text-center text-sm">Email: {data.storeEmail}</p>
            )}
            {data.storeWebsite && (
              <p className="text-center text-sm">Website: {data.storeWebsite}</p>
            )}
          </div>

          <div className="receipt-info my-2 text-sm">
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{displayDate}</span>
            </div>
            <div className="flex justify-between">
              <span>Time:</span>
              <span>{displayTime}</span>
            </div>
            <div className="flex justify-between">
              <span>Receipt #:</span>
              <span>{receiptId}</span>
            </div>
            {displayCustomer && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{displayCustomer}</span>
              </div>
            )}
            {displayPayment && (
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span>{displayPayment}</span>
              </div>
            )}
          </div>

          <div
            className="my-2"
            style={{
              borderTop: "1px dashed #000",
              borderBottom: "1px dashed #000",
            }}
          >
            <table className="receipt-table receipt-items w-full text-sm" style={{ borderCollapse: "separate" }}>
              <thead>
                <tr>
                  <th className="text-left">Item</th>
                  <th className="text-center">Qty</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {item.map((lineItem, index) => {
                  const maxLength = 13;
                  const displayName =
                    lineItem.name.length > maxLength
                      ? `${lineItem.name.slice(0, maxLength - 3)}...`
                      : lineItem.name;
                  const baseCellStyle = {
                    border: "none",
                    borderBottom: "1px dashed #e5e7eb",
                  };
                  const isLast = index === item.length - 1;
                  const cellStyle = isLast
                    ? { ...baseCellStyle, borderBottom: "none" }
                    : baseCellStyle;

                  return (
                    <tr key={index}>
                      <td className="text-left" style={cellStyle}>
                        {displayName}
                      </td>
                      <td className="text-center" style={cellStyle}>
                        {lineItem.quantityDisplay ?? lineItem.quantity}
                      </td>
                      <td className="text-right" style={cellStyle}>
                        {data.currencySymbol}
                        {lineItem.price.toFixed(2)}
                      </td>
                      <td className="text-right" style={cellStyle}>
                        {data.currencySymbol}
                        {(
                          lineItem.total ?? lineItem.price * lineItem.quantity
                        ).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="receipt-summary receipt-total text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>
                {data.currencySymbol}
                {subtotal.toFixed(2)}
              </span>
            </div>
            {discount && discount.amount > 0 && data.showDiscounts !== false && (
              <div className="flex justify-between">
                <span>
                  Discount
                  {discount.label ? ` (${discount.label})` : ""}
                </span>
                <span>
                  -{data.currencySymbol}
                  {discount.amount.toFixed(2)}
                </span>
              </div>
            )}
            {data.showTax && (
              <div className="flex justify-between">
                <span>Tax ({data.taxRate}%):</span>
                <span>
                  {data.currencySymbol}
                  {tax.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold mt-1">
              <span>Total:</span>
              <span>
                {data.currencySymbol}
                {total.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="receipt-payment text-sm mt-4">
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span>
                {data.currencySymbol}
                {total.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="receipt-footer mt-4 text-center text-sm" style={{ marginBottom: "24px" }}>
            {data.thankYouMessage && <p>{data.thankYouMessage}</p>}
            {data.returnPolicy && (
              <p className="text-xs mt-1">{data.returnPolicy}</p>
            )}
            {data.footerText && (
              <p className="text-xs mt-2">{data.footerText}</p>
            )}
          </div>
          <div className="receipt-barcode mt-2 flex justify-center">
            {data.showBarcode && (
              <Barcode
                value={receiptId}
                width={1}
                height={50}
                fontSize={12}
              />
            )}
          </div>

          {data.showInstagramQr && data.instagramUrl && (
            <div className="receipt-qr flex flex-col items-center text-center">
              <span className="qr-label">Follow us on Instagram</span>
          
              <QRCodeSVG
                value={data.instagramUrl}
                size={80}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                includeMargin
              />
              <div className="qr-handle">
                {data.instagramUrl
                  .replace("https://www.instagram.com/", "@")
                  .replace(/\/$/, "")}
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
);

ReceiptContent.displayName = "ReceiptContent";
