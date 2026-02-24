import type { ReceiptSettings } from "@/lib/db";

type ReceiptStyleConfig = Pick<
  ReceiptSettings,
  "fontFamily" | "fontSize" | "receiptWidth" | "logoSize"
>;

const pxToMm = (px: number) => (px / 96) * 25.4;

const withDefaults = (
  config?: Partial<ReceiptStyleConfig>
): Required<ReceiptStyleConfig> => ({
  fontFamily: config?.fontFamily || "Arial",
  fontSize: config?.fontSize ?? 12,
  receiptWidth: config?.receiptWidth ?? 300,
  logoSize: config?.logoSize ?? 100,
});

export const getReceiptStyles = (
  config?: Partial<ReceiptStyleConfig>,
  rootSelector = "body"
) => {
  const { fontFamily, fontSize, receiptWidth, logoSize } = withDefaults(config);
  const pageWidthMm = pxToMm(receiptWidth);

  return `
    @page {
      size: ${pageWidthMm}mm auto;
      margin: 0;
    }

    @media print {
      ${rootSelector} {
        padding: 0;
        margin: 0;
        width: ${receiptWidth}px;
        background: #ffffff;
      }

      ${rootSelector} .receipt-preview {
        padding: 0;
        margin: 0 auto;
        width: ${receiptWidth}px;
      }

      ${rootSelector} .receipt-table,
      ${rootSelector} .receipt-summary,
      ${rootSelector} .receipt-footer {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }

    ${rootSelector}, ${rootSelector} * {
      box-sizing: border-box;
    }

    ${rootSelector} {
      font-family: ${fontFamily}, sans-serif;
      font-size: ${fontSize}px;
      background: #ffffff;
      color: #000;
      padding: 0 12px 40px;
      direction: ltr;
      unicode-bidi: plaintext;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    ${rootSelector} img {
      max-width: 100%;
      height: auto;
    }

    ${rootSelector} .receipt-preview {
      width: ${receiptWidth}px;
      margin: 0 auto;
      padding: 0 0 40px 0;
    }

    ${rootSelector} .flex {
      display: flex;
    }

    ${rootSelector} .justify-between {
      justify-content: space-between;
    }

    ${rootSelector} .items-center {
      align-items: center;
    }

    ${rootSelector} .text-left { text-align: left; }
    ${rootSelector} .text-right { text-align: right; }
    ${rootSelector} .text-center { text-align: center; }
    ${rootSelector} .font-medium { font-weight: 500; }
    ${rootSelector} .font-bold { font-weight: 700; }
    ${rootSelector} .text-sm { font-size: ${Math.round(fontSize * 0.92)}px; }
    ${rootSelector} .text-xs { font-size: ${Math.round(fontSize * 0.8)}px; }
    ${rootSelector} .mt-1 { margin-top: 4px; }
    ${rootSelector} .mt-2 { margin-top: 8px; }
    ${rootSelector} .mt-4 { margin-top: 16px; }
    ${rootSelector} .mb-1 { margin-bottom: 4px; }
    ${rootSelector} .mb-2 { margin-bottom: 8px; }

    ${rootSelector} .receipt-header {
      text-align: center;
      margin-bottom: 12px;
    }

    ${rootSelector} .receipt-header h2 {
      margin: 8px 0 4px;
      font-size: ${Math.round(fontSize * 1.55)}px;
      line-height: 1.2;
    }

    ${rootSelector} .receipt-header p {
      margin: 2px 0;
      line-height: 1.25;
    }

    ${rootSelector} .receipt-logo {
      max-width: ${logoSize}px;
      max-height: ${logoSize}px;
      display: block;
      margin: 0 auto 8px;
      object-fit: contain;
    }

    ${rootSelector} .receipt-info {
      margin: 10px 0 6px;
    }

    ${rootSelector} .receipt-info p {
      margin: 2px 0;
    }

    ${rootSelector} .receipt-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: ${Math.round(fontSize * 0.92)}px;
    }

    ${rootSelector} .receipt-customer {
      text-align: left;
    }

    ${rootSelector} .receipt-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-top: 10px;
      font-size: ${fontSize}px;
    }

    ${rootSelector} .receipt-table th,
    ${rootSelector} .receipt-table td {
      padding: 6px;
      vertical-align: top;
      line-height: 1.25;
      border: none;
      border: 0px dashed #FFFFFF;
    }

    ${rootSelector} .receipt-table tr:last-child td {
      border-bottom: none;
      border: 0px dashed #FFFFFF;
    }

    ${rootSelector} .receipt-table th {
      text-align: left;
      font-weight: 700;
      border: none;
      border-bottom: 0px dashed #FFFFFF;
    }

    ${rootSelector} .receipt-table th:nth-child(2),
    ${rootSelector} .receipt-table td:nth-child(2) {
      text-align: center;
      white-space: nowrap;
    }

    ${rootSelector} .receipt-table th:nth-child(3),
    ${rootSelector} .receipt-table td:nth-child(3),
    ${rootSelector} .receipt-table th:nth-child(4),
    ${rootSelector} .receipt-table td:nth-child(4) {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    ${rootSelector} .receipt-summary {
      margin-top: 10px;
      border: 1px solid #FFFFFF;
      padding-top: 8px;
      font-size: ${fontSize}px;
    }

    ${rootSelector} .receipt-summary .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    ${rootSelector} .receipt-summary .total-row {
      font-size: ${Math.round(fontSize * 1.18)}px;
      font-weight: 700;
      margin-top: 8px;
    }

    ${rootSelector} .receipt-footer {
      text-align: center;
      margin-top: 14px;
      color: #4b5563;
      font-size: ${Math.round(fontSize * 0.86)}px;
      line-height: 1.25;
      margin-bottom: 10px;
    }

    ${rootSelector} .receipt-payment {
      margin-top: 12px;
      font-size: ${fontSize}px;
    }

    ${rootSelector} .receipt-payment .flex {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    ${rootSelector} .receipt-barcode,
    ${rootSelector} .receipt-qr {
      text-align: center;
    }

    ${rootSelector} .receipt-qr {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    ${rootSelector} .receipt-barcode svg {
      max-width: 240px;
      margin: 0 auto;
    }

    ${rootSelector} .receipt-qr .qr-label {
      font-weight: 600;
      margin-bottom: 6px;
    }

    ${rootSelector} .receipt-qr .qr-handle {
      font-size: ${Math.round(fontSize * 0.85)}px;
      color: #4b5563;
      margin-top: 4px;
    }

    ${rootSelector} tr, ${rootSelector} td, ${rootSelector} th {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  `;
};

export const getPrintStyles = (config?: Partial<ReceiptStyleConfig>) => `
  ${getReceiptStyles(config, "body")}
  @media print {
    body {
      padding: 0 !important;
      margin: 0 !important;
      background: #fff !important;
    }
    .no-print { display: none !important; }
  }
`;

export const openReceiptPrintWindow = (
  content: string,
  title: string,
  config?: Partial<ReceiptStyleConfig>
) => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    document.body.removeChild(iframe);
    return false;
  }

  const printStyles = getPrintStyles(config);
  const doc = frameWindow.document;

  doc.open("text/html", "replace");
  doc.write(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <style>${printStyles}</style>
      </head>
      <body>${content}</body>
    </html>`);
  doc.close();

  setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 500);
  }, 300);

  return true;
};
