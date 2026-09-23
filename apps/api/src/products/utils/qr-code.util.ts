import * as QRCode from 'qrcode';

export interface ProductQrResult {
  qrCodeDataUrl: string;
  verificationUrl: string;
}

/**
 * Generates a base64 PNG Data URL for a product's public verification URL.
 */
export async function generateProductQr(
  productCode: string,
  frontendBaseUrl: string = 'http://localhost:3000',
): Promise<ProductQrResult> {
  const verificationUrl = `${frontendBaseUrl.replace(/\/+$/, '')}/verify/${encodeURIComponent(productCode)}`;
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
  frontendBaseUrl: string = 'http://localhost:3000',
): Promise<Buffer> {
  const verificationUrl = `${frontendBaseUrl.replace(/\/+$/, '')}/verify/${encodeURIComponent(productCode)}`;
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
