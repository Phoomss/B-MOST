import * as QRCode from 'qrcode';

export interface ProductQrResult {
  qrCodeDataUrl: string;
  verificationUrl: string;
}

function buildVerificationUrl(
  productCode: string,
  frontendBaseUrl: string,
): string {
  // Correct a duplicated scheme in deployment settings, e.g. https:https://example.com.
  let baseUrl = frontendBaseUrl.trim();
  while (/^https?:https?:\/\//i.test(baseUrl)) {
    baseUrl = baseUrl.replace(/^https?:/i, '');
  }
  return `${baseUrl.replace(/\/+$/, '')}/verify/${encodeURIComponent(productCode)}`;
}

/**
 * Generates a base64 PNG Data URL for a product's public verification URL.
 */
export async function generateProductQr(
  productCode: string,
  frontendBaseUrl: string = process.env.WEB_URL ?? 'http://localhost:3000',
): Promise<ProductQrResult> {
  const verificationUrl = buildVerificationUrl(productCode, frontendBaseUrl);
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
    color: {
      dark: '#0f172a', // Tailwind slate-900
      light: '#ffffff',
    },
  });

  return {
    qrCodeDataUrl,
    verificationUrl,
  };
}

/**
 * Generates a raw PNG image buffer for QR code streaming.
 */
export async function generateProductQrBuffer(
  productCode: string,
  frontendBaseUrl: string = process.env.WEB_URL ?? 'http://localhost:3000',
): Promise<Buffer> {
  const verificationUrl = buildVerificationUrl(productCode, frontendBaseUrl);
  return QRCode.toBuffer(verificationUrl, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}
