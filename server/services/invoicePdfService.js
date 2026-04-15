import { generateInvoicePDF } from './pdf.js';
import { uploadPDFAndGetURL } from './s3.js';

/**
 * Generate invoice PDF, upload to S3, and return the signed URL
 * This is a convenience function that combines PDF generation and S3 upload
 * 
 * @param {Object} invoice - Invoice document from database
 * @param {Object} client - Client document from database
 * @param {Object} freelancer - User document (freelancer) from database
 * @returns {Promise<{key: string, signedUrl: string}>} Object with S3 key and signed URL
 */
export const generateAndUploadInvoicePDF = async (invoice, client, freelancer) => {
  try {
    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePDF(invoice, client, freelancer);
    
    // Create filename: invoice-{invoiceNumber}.pdf
    const filename = `invoice-${invoice.invoiceNumber}.pdf`;
    
    // Upload to S3 and get signed URL
    const { key, signedUrl } = await uploadPDFAndGetURL(pdfBuffer, filename);
    
    return {
      key,
      signedUrl,
    };
  } catch (error) {
    console.error('Error generating and uploading invoice PDF:', error);
    throw error;
  }
};
