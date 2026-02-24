import { format } from "date-fns";

type ToastFunction = (options: {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}) => void;

export function exportToCSV(
  sales: any[],
  _reportRef: { current: HTMLDivElement | null },
  toast: ToastFunction
) {
  const headers = [
    "Date",
    "Transaction ID",
    "Customer",
    "Payment Method",
    "Item",
    "SKU",
    "Quantity",
    "Unit Price",
    "Line Total",
  ];
  const csvRows = [headers];

  sales.forEach((sale) => {
    sale.items.forEach((item: any, index: number) => {
      const quantity =
        typeof item.quantity === "number"
          ? item.quantity
          : Number(item.quantity) || 0;
      const unitPrice =
        typeof item.product?.price === "number"
          ? item.product.price
          : typeof item.price === "number"
          ? item.price
          : quantity && typeof item.total === "number"
          ? item.total / quantity
          : 0;
      const lineTotal =
        typeof item.total === "number" ? item.total : unitPrice * quantity;
      const row = [
        format(new Date(sale.date), "yyyy-MM-dd HH:mm:ss"),
        sale.id,
        sale.customerName || "Walk-in Customer",
        sale.paymentMethod === "credit"
          ? "Credit Card"
          : sale.paymentMethod === "cash"
          ? "Cash"
          : "Mobile Payment",
        item.product?.name || item.name || `Item ${index + 1}`,
        item.product?.sku || "-",
        quantity.toFixed(2),
        unitPrice.toFixed(2),
        lineTotal.toFixed(2),
      ];
      csvRows.push(row);
    });
  });

  const csvContent = csvRows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `sales_report_${format(new Date(), "yyyy-MM-dd")}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast({
    title: "Report Exported",
    description: "The sales report has been exported as CSV.",
  });
}

export function printReport(
  reportRef: { current: HTMLDivElement | null },
  sales: any[],
  toast: ToastFunction
) {
  if (!reportRef.current) {
    toast({
      title: "Print Error",
      description: "No report content is available to print.",
      variant: "destructive",
    });
    return;
  }

  const printableContent = reportRef.current.innerHTML;
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast({
      title: "Print Error",
      description:
        "Could not open print window. Please check your browser settings.",
      variant: "destructive",
    });
    return;
  }

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

  printWindow.document.write(`
    <html>
      <head>
        <title>Sales Report - ${format(new Date(), "yyyy-MM-dd")}</title>
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            font-family: "Inter", "Segoe UI", Arial, sans-serif;
            padding: 24px;
            background: #ffffff;
            color: #111827;
            max-width: 1100px;
            margin: 0 auto;
          }
          h1 {
            text-align: center;
            font-size: 26px;
            margin-bottom: 8px;
          }
          .report-meta {
            text-align: center;
            margin-bottom: 24px;
            color: #4b5563;
            font-size: 14px;
          }
          .report-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
            margin-bottom: 24px;
          }
          .summary-card {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 16px;
            background: #f9fafb;
          }
          .summary-title {
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .summary-value {
            font-size: 20px;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
          }
          th {
            text-align: left;
            padding: 10px 8px;
            background: #f3f4f6;
            font-size: 13px;
            color: #4b5563;
            border-bottom: 1px solid #e5e7eb;
          }
          td {
            padding: 10px 8px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 13px;
          }
          tr:nth-child(even) td {
            background: #f9fafb;
          }
          @media print {
            body {
              padding: 12mm;
            }
            @page {
              size: auto;
              margin: 12mm;
            }
          }
        </style>
      </head>
      <body>
        <h1>Sales Report</h1>
        <div class="report-meta">
          Generated ${format(new Date(), "MMMM dd, yyyy 'at' HH:mm a")}
        </div>
        <div class="report-summary">
          <div class="summary-card">
            <div class="summary-title">Total Revenue</div>
            <div class="summary-value">$${totalRevenue.toFixed(2)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Transactions</div>
            <div class="summary-value">${sales.length}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Average Ticket</div>
            <div class="summary-value">$${(
              sales.length ? totalRevenue / sales.length : 0
            ).toFixed(2)}</div>
          </div>
        </div>
        ${printableContent}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 200);

  toast({
    title: "Report Printed",
    description: "The sales report has been sent to the printer.",
  });
}

export function exportProductBreakdown(
  rows: Array<{
    productId: string;
    name: string;
    sku?: string;
    category?: string;
    quantity: number;
    revenue: number;
    avgPrice: number;
  }>,
  toast: ToastFunction
) {
  if (!rows.length) {
    toast({
      title: "Nothing to export",
      description: "There are no product rows for the selected filters.",
      variant: "destructive",
    });
    return;
  }

  const headers = [
    "Product",
    "SKU",
    "Category",
    "Units Sold",
    "Revenue",
    "Average Price",
  ];

  const csvRows = [headers];
  rows.forEach((row) => {
    csvRows.push([
      row.name,
      row.sku || "-",
      row.category || "Uncategorized",
      row.quantity.toFixed(2),
      row.revenue.toFixed(2),
      row.avgPrice.toFixed(2),
    ]);
  });

  const csvContent = csvRows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `product-breakdown_${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast({
    title: "Product breakdown exported",
    description: `Saved ${rows.length} rows to CSV`,
  });
}

export function printInvoice(sale: any, toast: ToastFunction) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast({
      title: "Print Error",
      description:
        "Could not open print window. Please check your browser settings.",
      variant: "destructive",
    });
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>Invoice - ${sale.id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 600px;
            margin: 0 auto;
          }
          h1, h2 {
            text-align: center;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f2f2f2;
          }
        </style>
      </head>
      <body>
        <h1>Invoice</h1>
        <p><strong>Transaction ID:</strong> ${sale.id}</p>
        <p><strong>Date:</strong> ${format(
          new Date(sale.date),
          "MMM dd, yyyy HH:mm"
        )}</p>
        <p><strong>Customer:</strong> ${
          sale.customerName || "Walk-in Customer"
        }</p>
        <h2>Items</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items
              .map(
                (item: any) => `
              <tr>
                <td>${
                  item.product?.name ||
                  item.name ||
                  item.productId ||
                  "Item"
                }</td>
                <td>${item.quantity}</td>
                <td>$${item.price.toFixed(2)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <p><strong>Total:</strong> $${sale.total.toFixed(2)}</p>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 200);

  toast({
    title: "Invoice Printed",
    description: `Invoice for transaction ${sale.id} has been sent to the printer.`,
  });
}
