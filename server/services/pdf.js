import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Generate a professional invoice PDF
 * @param {Object} invoice - Invoice document from database
 * @param {Object} client - Client document from database
 * @param {Object} freelancer - User document (freelancer) from database
 * @returns {Promise<Uint8Array>} PDF buffer
 */
export const generateInvoicePDF = async (invoice, client, freelancer) => {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Add a page
  const page = pdfDoc.addPage([612, 792]); // US Letter size (8.5 x 11 inches)
  const { width, height } = page.getSize();
  
  // Load fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Colors
  const primaryColor = rgb(0.2, 0.4, 0.8); // Blue
  const textColor = rgb(0, 0, 0); // Black
  const grayColor = rgb(0.5, 0.5, 0.5); // Gray
  
  let yPosition = height - 50; // Start from top
  
  // ========== HEADER SECTION ==========
  
  // Business Name / Logo Section
  if (freelancer.logoUrl) {
    // If logo URL exists, you could fetch and embed image here
    // For now, we'll just use business name
    page.drawText(freelancer.businessName || freelancer.name, {
      x: 50,
      y: yPosition,
      size: 24,
      font: helveticaBoldFont,
      color: primaryColor,
    });
  } else {
    page.drawText(freelancer.businessName || freelancer.name, {
      x: 50,
      y: yPosition,
      size: 24,
      font: helveticaBoldFont,
      color: primaryColor,
    });
  }
  
  yPosition -= 30;
  
  // Invoice Title
  page.drawText('INVOICE', {
    x: width - 150,
    y: yPosition + 20,
    size: 32,
    font: helveticaBoldFont,
    color: primaryColor,
  });
  
  yPosition -= 50;
  
  // ========== INVOICE DETAILS SECTION ==========
  
  // Invoice Number
  page.drawText('Invoice Number:', {
    x: 50,
    y: yPosition,
    size: 10,
    font: helveticaBoldFont,
    color: textColor,
  });
  page.drawText(invoice.invoiceNumber, {
    x: 150,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: textColor,
  });
  
  // Invoice Date (right side)
  const invoiceDate = new Date(invoice.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  page.drawText('Date:', {
    x: width - 200,
    y: yPosition,
    size: 10,
    font: helveticaBoldFont,
    color: textColor,
  });
  page.drawText(invoiceDate, {
    x: width - 150,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: textColor,
  });
  
  yPosition -= 20;
  
  // Due Date
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  page.drawText('Due Date:', {
    x: 50,
    y: yPosition,
    size: 10,
    font: helveticaBoldFont,
    color: textColor,
  });
  page.drawText(dueDate, {
    x: 150,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: textColor,
  });
  
  // Status (right side)
  const statusColors = {
    draft: rgb(0.5, 0.5, 0.5),
    sent: rgb(0.2, 0.6, 0.8),
    paid: rgb(0, 0.7, 0),
    overdue: rgb(0.9, 0, 0)
  };
  page.drawText('Status:', {
    x: width - 200,
    y: yPosition,
    size: 10,
    font: helveticaBoldFont,
    color: textColor,
  });
  page.drawText(invoice.status.toUpperCase(), {
    x: width - 150,
    y: yPosition,
    size: 10,
    font: helveticaBoldFont,
    color: statusColors[invoice.status] || grayColor,
  });
  
  yPosition -= 50;
  
  // ========== CLIENT INFORMATION SECTION ==========
  
  page.drawText('Bill To:', {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaBoldFont,
    color: textColor,
  });
  
  yPosition -= 20;
  
  // Client details
  const clientDetails = [
    client.name,
    client.company || '',
    client.email,
    client.phone || '',
    client.address || ''
  ].filter(Boolean);
  
  clientDetails.forEach((detail) => {
    page.drawText(detail, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: textColor,
    });
    yPosition -= 15;
  });
  
  yPosition -= 30;
  
  // ========== LINE ITEMS TABLE ==========
  
  // Table Header
  const tableTop = yPosition;
  const tableHeaderY = yPosition;
  
  // Header background
  page.drawRectangle({
    x: 50,
    y: tableHeaderY - 5,
    width: width - 100,
    height: 25,
    color: rgb(0.9, 0.9, 0.9),
  });
  
  // Header text
  page.drawText('Description', {
    x: 55,
    y: tableHeaderY + 5,
    size: 10,
    font: helveticaBoldFont,
    color: textColor,
  });
  
  page.drawText('Qty', {
    x: width - 300,
    y: tableHeaderY + 5,
    size: 10,
    font: helveticaBoldFont,
    color: textColor,
  });
  
  page.drawText('Unit Price', {
    x: width - 250,
    y: tableHeaderY + 5,
    size: 10,
    font: helveticaBoldFont,
    color: textColor,
  });
  
  page.drawText('Amount', {
    x: width - 150,
    y: tableHeaderY + 5,
    size: 10,
    font: helveticaBoldFont,
    color: textColor,
  });
  
  yPosition -= 30;
  
  // Line items
  invoice.lineItems.forEach((item) => {
    const itemAmount = item.quantity * item.unitPrice;
    
    // Draw item row
    page.drawText(item.description, {
      x: 55,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: textColor,
      maxWidth: width - 350,
    });
    
    page.drawText(item.quantity.toString(), {
      x: width - 300,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: textColor,
    });
    
    page.drawText(`$${item.unitPrice.toFixed(2)}`, {
      x: width - 250,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: textColor,
    });
    
    page.drawText(`$${itemAmount.toFixed(2)}`, {
      x: width - 150,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: textColor,
    });
    
    yPosition -= 20;
    
    // Add new page if needed
    if (yPosition < 200) {
      const newPage = pdfDoc.addPage([612, 792]);
      yPosition = newPage.getSize().height - 50;
    }
  });
  
  yPosition -= 20;
  
  // ========== TOTALS SECTION ==========
  
  let totalsStartY = yPosition;
  
  // Subtotal
  page.drawText('Subtotal:', {
    x: width - 200,
    y: totalsStartY,
    size: 10,
    font: helveticaFont,
    color: textColor,
  });
  page.drawText(`$${invoice.subtotal.toFixed(2)}`, {
    x: width - 100,
    y: totalsStartY,
    size: 10,
    font: helveticaFont,
    color: textColor,
  });
  
  totalsStartY -= 20;
  
  // Tax
  if (invoice.tax > 0) {
    const taxAmount = (invoice.subtotal * invoice.tax) / 100;
    page.drawText(`Tax (${invoice.tax}%):`, {
      x: width - 200,
      y: totalsStartY,
      size: 10,
      font: helveticaFont,
      color: textColor,
    });
    page.drawText(`$${taxAmount.toFixed(2)}`, {
      x: width - 100,
      y: totalsStartY,
      size: 10,
      font: helveticaFont,
      color: textColor,
    });
    totalsStartY -= 20;
  }
  
  // Discount
  if (invoice.discount > 0) {
    const discountAmount = ((invoice.subtotal + (invoice.subtotal * invoice.tax) / 100) * invoice.discount) / 100;
    page.drawText(`Discount (${invoice.discount}%):`, {
      x: width - 200,
      y: totalsStartY,
      size: 10,
      font: helveticaFont,
      color: textColor,
    });
    page.drawText(`-$${discountAmount.toFixed(2)}`, {
      x: width - 100,
      y: totalsStartY,
      size: 10,
      font: helveticaFont,
      color: rgb(0.9, 0, 0), // Red for discount
    });
    totalsStartY -= 20;
  }
  
  // Total (bold, larger)
  totalsStartY -= 10;
  page.drawRectangle({
    x: width - 210,
    y: totalsStartY - 5,
    width: 160,
    height: 30,
    color: rgb(0.95, 0.95, 0.95),
  });
  
  page.drawText('Total:', {
    x: width - 200,
    y: totalsStartY + 10,
    size: 14,
    font: helveticaBoldFont,
    color: textColor,
  });
  page.drawText(`$${invoice.total.toFixed(2)}`, {
    x: width - 100,
    y: totalsStartY + 10,
    size: 14,
    font: helveticaBoldFont,
    color: primaryColor,
  });
  
  // ========== FOOTER ==========
  
  const footerY = 50;
  page.drawText('Thank you for your business!', {
    x: width / 2 - 100,
    y: footerY,
    size: 10,
    font: helveticaFont,
    color: grayColor,
  });
  
  // Serialize the PDF to bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};
