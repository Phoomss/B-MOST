import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateProductPage from '../app/products/new/page';
import { api } from '../lib/api';
import { executeUserSignedAction } from '../lib/blockchain/wallet';

vi.mock('../lib/blockchain/wallet', () => ({ executeUserSignedAction: vi.fn() }));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('../components/Navbar', () => ({
  Navbar: () => <nav data-testid="mock-navbar">Navbar</nav>,
}));

vi.mock('../lib/api', () => ({
  api: {
    products: {
      create: vi.fn(),
    },
  },
}));

describe('Product Registration Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form inputs for product code, serial, name, category, description, and blockchain option', () => {
    render(<CreateProductPage />);

    expect(screen.getByText('Register New Product')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. PRD-2026-0001')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. SN-8921473')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Industrial IoT Sensor Probe')).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/register immediately onto smart contract/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register product/i })).toBeInTheDocument();
  });

  it('auto-generates product code and serial number when buttons are clicked', () => {
    render(<CreateProductPage />);

    const autoCodeBtn = screen.getAllByRole('button', { name: /auto-generate/i })[0];
    const autoSerialBtn = screen.getAllByRole('button', { name: /auto-generate/i })[1];

    fireEvent.click(autoCodeBtn);
    const codeInput = screen.getByPlaceholderText('e.g. PRD-2026-0001') as HTMLInputElement;
    expect(codeInput.value).toMatch(/^PRD-\d{4}-\d{4}$/);

    fireEvent.click(autoSerialBtn);
    const serialInput = screen.getByPlaceholderText('e.g. SN-8921473') as HTMLInputElement;
    expect(serialInput.value).toMatch(/^SN-[A-Z0-9]+$/);
  });

  it('submits form with correct payload including registerOnBlockchain flag and redirects to product detail', async () => {
    vi.mocked(executeUserSignedAction).mockResolvedValueOnce({ verified: true, synced: true } as any);
    vi.mocked(api.products.create).mockResolvedValueOnce({
      id: 'prod-new-uuid',
      productCode: 'PRD-TEST-001',
      serialNumber: 'SN-TEST-999',
      name: 'High Precision Sensor',
      status: 'REGISTERED',
      manufacturerId: 'mfg-1',
      currentOwnerId: 'mfg-1',
      createdAt: '2026-09-24T00:00:00Z',
      updatedAt: '2026-09-24T00:00:00Z',
    });

    render(<CreateProductPage />);

    fireEvent.change(screen.getByPlaceholderText('e.g. PRD-2026-0001'), {
      target: { value: 'PRD-TEST-001' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. SN-8921473'), {
      target: { value: 'SN-TEST-999' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Industrial IoT Sensor Probe'), {
      target: { value: 'High Precision Sensor' },
    });

    const checkbox = screen.getByLabelText(/register immediately onto smart contract/i);
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: /register product/i }));

    await waitFor(() => {
      expect(api.products.create).toHaveBeenCalledWith({
        productCode: 'PRD-TEST-001',
        serialNumber: 'SN-TEST-999',
        name: 'High Precision Sensor',
        category: undefined,
        description: undefined,
        registerOnBlockchain: false,
      });
      expect(executeUserSignedAction).toHaveBeenCalledWith({ action: 'registerProduct', entityId: 'prod-new-uuid' });
      expect(mockPush).toHaveBeenCalledWith('/products/prod-new-uuid');
    });
  });

  it('displays error banner when product creation fails', async () => {
    vi.mocked(api.products.create).mockRejectedValueOnce(
      new Error('Product code already exists'),
    );

    render(<CreateProductPage />);

    fireEvent.change(screen.getByPlaceholderText('e.g. PRD-2026-0001'), {
      target: { value: 'PRD-EXISTING' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. SN-8921473'), {
      target: { value: 'SN-001' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Industrial IoT Sensor Probe'), {
      target: { value: 'Duplicate Product' },
    });

    fireEvent.click(screen.getByRole('button', { name: /register product/i }));

    await waitFor(() => {
      expect(screen.getByText('Registration Error')).toBeInTheDocument();
      expect(screen.getByText('Product code already exists')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
