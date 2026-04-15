import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configure AWS S3 client (dotenv is loaded in index.js)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

/**
 * Upload PDF buffer to S3
 * @param {Uint8Array|Buffer} pdfBuffer - PDF file buffer
 * @param {string} filename - Filename for the PDF (e.g., 'invoice-123.pdf')
 * @returns {Promise<string>} S3 object key
 */
export const uploadPDF = async (pdfBuffer, filename) => {
  try {
    const key = `invoices/${filename}`;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      // Optional: Add metadata
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });
    
    await s3Client.send(command);
    
    console.log(`PDF uploaded successfully: ${key}`);
    return key;
  } catch (error) {
    console.error('Error uploading PDF to S3:', error);
    throw new Error(`Failed to upload PDF to S3: ${error.message}`);
  }
};

/**
 * Recover S3 object key from stored Invoice.pdfUrl (HTTPS pre-signed URL or plain key).
 * Stored pre-signed URLs expire; signing again requires the object key, not the old query string.
 */
export const extractS3KeyFromInvoicePdfStoredValue = (stored) => {
  const s = (stored || '').trim();
  if (!s) return '';
  const withoutQuery = s.split('?')[0];
  if (!/^https?:\/\//i.test(withoutQuery)) {
    return withoutQuery.replace(/^\//, '');
  }
  try {
    const u = new URL(withoutQuery);
    let path = (u.pathname || '').replace(/^\//, '');
    const idx = path.indexOf('invoices/');
    if (idx >= 0) return path.slice(idx);
    return path;
  } catch {
    return '';
  }
};

/**
 * New pre-signed GET URL for an invoice PDF (return to client only; do not rely on stored pdfUrl long-term).
 */
export const getFreshSignedUrlForInvoicePdf = async (
  pdfUrlField,
  pdfS3Key = '',
  expiresIn = 7 * 24 * 60 * 60
) => {
  const key =
    (pdfS3Key && String(pdfS3Key).trim()) ||
    extractS3KeyFromInvoicePdfStoredValue(pdfUrlField);
  if (!key) return '';
  return getSignedURL(key, expiresIn);
};

/**
 * Generate a pre-signed URL for accessing the PDF
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration time in seconds (default: 7 days)
 * @returns {Promise<string>} Pre-signed URL
 */
export const getSignedURL = async (key, expiresIn = 7 * 24 * 60 * 60) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

/**
 * Helper function to upload PDF and get signed URL in one call
 * @param {Uint8Array|Buffer} pdfBuffer - PDF file buffer
 * @param {string} filename - Filename for the PDF
 * @returns {Promise<{key: string, signedUrl: string}>} Object with S3 key and signed URL
 */
export const uploadPDFAndGetURL = async (pdfBuffer, filename) => {
  const key = await uploadPDF(pdfBuffer, filename);
  const signedUrl = await getSignedURL(key);
  
  return {
    key,
    signedUrl,
  };
};
