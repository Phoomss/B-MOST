import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductsPage from '../app/products/page';
import { api, type ProductItem } from '../lib/api';

vi.mock('../components/Navbar', () => ({ Navbar: () => <nav /> }));
vi.mock('../lib/api', () => ({ api: { products: { list: vi.fn() } } }));

const draftProduct: ProductItem = {
  id: 'draft-1',
  productCode: 'PRD-2026-3741',
  serialNumber: 'SN-3741',
  name: 'Temperature sensor',
  status: 'REGISTERED',
  manufacturerId: 'org-1',
  currentOwnerId: 'org-1',
  blockchainProductId: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const response = {
  data: [draftProduct],
  meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
};

describe('products page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.products.list).mockResolvedValue(response);
  });

  it('shows a clear route to manage products waiting for Blockchain registration', async () => {
    render(<ProductsPage />);
    expect((await screen.findAllByText('PRD-2026-3741')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('รอบันทึกบน Blockchain').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /จัดการสินค้า/ }).some((link) => link.getAttribute('href') === '/products/draft-1')).toBe(true);
  });

  it('waits for search submission and sends the Blockchain filter to the API', async () => {
    render(<ProductsPage />);
    await screen.findAllByText('PRD-2026-3741');
    expect(api.products.list).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText('ค้นหาสินค้า'), { target: { value: '  PRD-2026-3741  ' } });
    expect(api.products.list).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'ค้นหา' }));
    await waitFor(() => expect(api.products.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'PRD-2026-3741', page: 1 })));

    fireEvent.click(screen.getByRole('button', { name: 'รอบันทึก' }));
    await waitFor(() => expect(api.products.list).toHaveBeenLastCalledWith(expect.objectContaining({ blockchainState: 'PENDING', search: 'PRD-2026-3741' })));
  });
});
