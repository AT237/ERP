import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface PdfGenerationOptions {
  filename?: string;
  quality?: number; // 0-1, default 0.95
  scale?: number; // scale for html2canvas, default 2 for better quality
}

/**
 * Generate PDF from HTML element using html2canvas + jsPDF
 * @param elementId ID of the HTML element to convert to PDF
 * @param options PDF generation options
 * @returns Promise that resolves when PDF is generated and downloaded
 */
export async function generatePdfFromElement(
  elementId: string,
  options: PdfGenerationOptions = {}
): Promise<void> {
  const {
    filename = "document.pdf",
    quality = 0.95,
    scale = 2,
  } = options;

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    // Generate canvas from HTML element
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    // A4 dimensions in mm
    const pdfWidth = 210;
    const pdfHeight = 297;

    // Calculate image dimensions to fit A4
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // Create PDF (portrait, mm, A4)
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Convert canvas to image
    const imgData = canvas.toDataURL("image/jpeg", quality);

    // Calculate how many pages we need
    const pageHeight = pdfHeight;
    const totalPages = Math.ceil(imgHeight / pageHeight);

    // Add pages by slicing the image
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      // Calculate source rectangle for this page
      const sourceY = page * pageHeight;
      const sourceHeight = Math.min(pageHeight, imgHeight - sourceY);

      // For html2canvas output, we need to crop the canvas
      // Create a temporary canvas to hold the page slice
      const pageCanvas = document.createElement('canvas');
      const pageCtx = pageCanvas.getContext('2d');
      if (!pageCtx) continue;

      // Calculate pixel dimensions (scale from mm to pixels)
      const pixelsPerMm = canvas.width / imgWidth;
      const sourceYPx = sourceY * pixelsPerMm;
      const sourceHeightPx = sourceHeight * pixelsPerMm;

      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeightPx;

      // Draw the slice from the original canvas
      pageCtx.drawImage(
        canvas,
        0, sourceYPx,           // source x, y
        canvas.width, sourceHeightPx, // source width, height
        0, 0,                   // dest x, y
        canvas.width, sourceHeightPx  // dest width, height
      );

      // Convert page canvas to image and add to PDF
      const pageImgData = pageCanvas.toDataURL("image/jpeg", quality);
      pdf.addImage(pageImgData, "JPEG", 0, 0, imgWidth, sourceHeight);
    }

    // Download PDF
    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF");
  }
}

/**
 * Generate quotation PDF
 * @param quotationNumber Quotation number for filename
 * @returns Promise that resolves when PDF is generated
 */
export async function generateQuotationPdf(
  quotationNumber: string
): Promise<void> {
  const filename = `Offerte_${quotationNumber}.pdf`;
  await generatePdfFromElement("print-preview", { filename });
}

/**
 * Open PDF in new tab (for preview before download)
 * @param elementId ID of the HTML element to convert to PDF
 * @param options PDF generation options
 */
export async function previewPdfInNewTab(
  elementId: string,
  options: PdfGenerationOptions = {}
): Promise<void> {
  const { quality = 0.95, scale = 2 } = options;

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    // Generate canvas
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    // A4 dimensions
    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // Create PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Convert canvas to image
    const imgData = canvas.toDataURL("image/jpeg", quality);

    // Calculate pages
    const pageHeight = pdfHeight;
    const totalPages = Math.ceil(imgHeight / pageHeight);

    // Add pages by slicing the image
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      const sourceY = page * pageHeight;
      const sourceHeight = Math.min(pageHeight, imgHeight - sourceY);

      // Create page slice
      const pageCanvas = document.createElement('canvas');
      const pageCtx = pageCanvas.getContext('2d');
      if (!pageCtx) continue;

      const pixelsPerMm = canvas.width / imgWidth;
      const sourceYPx = sourceY * pixelsPerMm;
      const sourceHeightPx = sourceHeight * pixelsPerMm;

      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeightPx;

      pageCtx.drawImage(
        canvas,
        0, sourceYPx,
        canvas.width, sourceHeightPx,
        0, 0,
        canvas.width, sourceHeightPx
      );

      const pageImgData = pageCanvas.toDataURL("image/jpeg", quality);
      pdf.addImage(pageImgData, "JPEG", 0, 0, imgWidth, sourceHeight);
    }

    // Open in new tab
    const pdfBlob = pdf.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
  } catch (error) {
    console.error("Error generating PDF preview:", error);
    throw new Error("Failed to generate PDF preview");
  }
}
