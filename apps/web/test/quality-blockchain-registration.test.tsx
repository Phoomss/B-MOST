import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QualityPage from '../app/quality/page';
import { api } from '../lib/api';
import { executeUserSignedAction } from '../lib/blockchain/wallet';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('../components/Navbar', () => ({ Navbar: () => <nav /> }));
vi.mock('../lib/blockchain/wallet', () => ({ executeUserSignedAction: vi.fn() }));
vi.mock('../lib/api', () => ({
  api: {
    products: { list: vi.fn() },
    qualityChecks: { list: vi.fn() },
  },
}));

describe('quality control registration prerequisite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.products.list).mockResolvedValue({
      data: [{ id: 'product-1', productCode: 'PRD-1', name: 'Sensor', status: 'REGISTERED', blockchainProductId: null }],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    } as Awaited<ReturnType<typeof api.products.list>>);
    vi.mocked(api.qualityChecks.list).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 30, totalPages: 0 } } as Awaited<ReturnType<typeof api.qualityChecks.list>>);
  });

  it('explains how to register an unsynced product before quality control', async () => {
    render(<QualityPage />);
    const option = await screen.findByRole('option', { name: /PRD-1/ });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: (option as HTMLOptionElement).value } });

    expect(screen.getByRole('status')).toHaveTextContent('สินค้านี้ยังไม่ได้บันทึกบน Blockchain');
    expect(screen.getByRole('link', { name: 'ไปหน้าสินค้า' })).toHaveAttribute('href', '/products/product-1');
    expect(screen.getByRole('button', { name: 'บันทึกผลการตรวจสอบ' })).toBeDisabled();
    expect(executeUserSignedAction).not.toHaveBeenCalled();
  });

  it('allows quality control for a product with a blockchain ID', async () => {
    vi.mocked(api.products.list).mockResolvedValue({
      data: [{ id: 'product-1', productCode: 'PRD-1', name: 'Sensor', status: 'REGISTERED', blockchainProductId: '3' }],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    } as Awaited<ReturnType<typeof api.products.list>>);
    render(<QualityPage />);
    await screen.findByRole('option', { name: /PRD-1/ });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'product-1' } });

    expect(screen.queryByText('สินค้านี้ยังไม่ได้บันทึกบน Blockchain')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'บันทึกผลการตรวจสอบ' })).toBeEnabled();
  });
});
