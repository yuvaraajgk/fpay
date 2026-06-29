import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

export const uploadPDF = async (pdfBuffer, filename) => {
  try {
    const key = `invoices/${filename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
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

// Recovers S3 key from a stored pre-signed URL (query params stripped) or a plain key
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

export const getSignedURL = async (key, expiresIn = 7 * 24 * 60 * 60) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

export const uploadPDFAndGetURL = async (pdfBuffer, filename) => {
  const key = await uploadPDF(pdfBuffer, filename);
  const signedUrl = await getSignedURL(key);
  return { key, signedUrl };
};
