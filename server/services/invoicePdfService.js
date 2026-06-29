import { generateInvoicePDF } from './pdf.js';
import { uploadPDFAndGetURL } from './s3.js';

export const generateAndUploadInvoicePDF = async (invoice, client, freelancer) => {
  try {
    const pdfBuffer = await generateInvoicePDF(invoice, client, freelancer);
    const filename = `invoice-${invoice.invoiceNumber}.pdf`;
    const { key, signedUrl } = await uploadPDFAndGetURL(pdfBuffer, filename);
    return { key, signedUrl };
  } catch (error) {
    console.error('Error generating and uploading invoice PDF:', error);
    throw error;
  }
};
