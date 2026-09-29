import * as QRCode from 'qrcode';
import { generateProductQr, generateProductQrBuffer } from './qr-code.util';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,test'),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('png')),
}));

describe('product QR URLs', () => {
  const expectedUrl = 'https://b-most-web.vercel.app/verify/PRD-2026-2125';

  it('corrects a duplicated scheme in the returned URL and encoded QR', async () => {
    const result = await generateProductQr(
      'PRD-2026-2125',
      ' https:https://b-most-web.vercel.app/ ',
    );

    expect(result.verificationUrl).toBe(expectedUrl);
    expect(QRCode.toDataURL).toHaveBeenCalledWith(
      expectedUrl,
      expect.any(Object),
    );
  });

  it('uses the corrected URL in the streamed PNG QR', async () => {
    await generateProductQrBuffer(
      'PRD-2026-2125',
      'https:https://b-most-web.vercel.app',
    );

    expect(QRCode.toBuffer).toHaveBeenCalledWith(
      expectedUrl,
      expect.any(Object),
    );
  });
});
