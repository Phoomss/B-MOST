import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DraftProductActions } from '../components/DraftProductActions';
import { api, type ProductItem } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/api', () => ({ api: { products: { update: vi.fn(), remove: vi.fn() } } }));

const draft = {
  id: 'product-1', productCode: 'PRD-1', serialNumber: 'SN-1', name: 'Sensor',
  category: 'Electronics', description: '', manufacturerId: 'org-1',
  blockchainProductId: null, blockchainTxHash: null,
} as ProductItem;

describe('draft product actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-1', email: 'mfg@example.com', role: 'MANUFACTURER', organizationId: 'org-1' }, loading: false, isAuthenticated: true, logout: vi.fn() });
  });

  it('lets the manufacturer edit a draft', async () => {
    const onUpdated = vi.fn();
    vi.mocked(api.products.update).mockResolvedValue({ ...draft, productCode: 'PRD-2' });
    render(<DraftProductActions product={draft} onUpdated={onUpdated} />);
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขข้อมูล' }));
    fireEvent.change(screen.getByLabelText('รหัสสินค้า'), { target: { value: 'PRD-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการแก้ไข' }));

    await waitFor(() => expect(api.products.update).toHaveBeenCalledWith('product-1', expect.objectContaining({ productCode: 'PRD-2' })));
    expect(onUpdated).toHaveBeenCalled();
  });

  it('requires confirmation before deleting a draft', async () => {
    vi.mocked(api.products.remove).mockResolvedValue({ success: true, message: 'deleted' });
    render(<DraftProductActions product={draft} onUpdated={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'ลบสินค้า' }));
    expect(api.products.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันลบสินค้า' }));
    await waitFor(() => expect(api.products.remove).toHaveBeenCalledWith('product-1'));
    expect(push).toHaveBeenCalledWith('/products');
  });

  it('hides actions after blockchain registration', () => {
    render(<DraftProductActions product={{ ...draft, blockchainProductId: '3' }} onUpdated={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'แก้ไขข้อมูล' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ลบสินค้า' })).not.toBeInTheDocument();
  });

  it('hides actions from an auditor', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'auditor-1', email: 'audit@example.com', role: 'AUDITOR', organizationId: 'org-1' }, loading: false, isAuthenticated: true, logout: vi.fn() });
    render(<DraftProductActions product={draft} onUpdated={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'แก้ไขข้อมูล' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ลบสินค้า' })).not.toBeInTheDocument();
  });
});
