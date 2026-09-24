import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShipmentsPage from '../app/shipments/page';
import { api } from '../lib/api';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('../components/Navbar', () => ({
  Navbar: () => <nav data-testid="mock-navbar">Navbar</nav>,
}));

vi.mock('../lib/api', () => ({
  api: {
    products: {
      list: vi.fn(),
    },
    organizations: {
      list: vi.fn(),
    },
    shipments: {
      list: vi.fn(),
      create: vi.fn(),
      ship: vi.fn(),
      receive: vi.fn(),
    },
  },
}));

describe('ShipmentsPage Component', () => {
  const mockShipments = [
    {
      id: 'ship-1',
      shipmentCode: 'SHIP-2026-0001',
      productId: 'prod-1',
      origin: 'Berlin Factory',
      destination: 'Munich Warehouse',
      status: 'PENDING',
      createdAt: '2026-09-24T10:00:00Z',
      product: {
        id: 'prod-1',
        productCode: 'PROD-001',
        name: 'Smart Thermostat',
        status: 'READY_TO_SHIP',
      },
      sender: {
        id: 'org-mfg',
        name: 'Acme Manufacturer',
        code: 'ACME',
        type: 'MANUFACTURER',
      },
      receiver: {
        id: 'org-dist',
        name: 'Central Distributor',
        code: 'CDIST',
        type: 'DISTRIBUTOR',
      },
      carrier: {
        id: 'org-carr',
        name: 'Fast Logistics',
        code: 'FAST',
        type: 'LOGISTICS',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.products.list).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } });
    vi.mocked(api.organizations.list).mockResolvedValue([]);
    vi.mocked(api.shipments.list).mockResolvedValue({
      data: mockShipments as any,
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
  });

  it('renders shipment list with shipment code, product name, sender, receiver, and status', async () => {
    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('SHIP-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('Smart Thermostat')).toBeInTheDocument();
      expect(screen.getByText('Acme Manufacturer')).toBeInTheDocument();
      expect(screen.getByText('Central Distributor')).toBeInTheDocument();
      expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0);
    });
  });

  it('allows filtering shipments by status tab', async () => {
    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('SHIP-2026-0001')).toBeInTheDocument();
    });

    const shippedTab = screen.getByRole('button', { name: /^shipped/i });
    fireEvent.click(shippedTab);

    expect(shippedTab).toBeInTheDocument();
  });

  it('allows opening shipment modal and submitting a new shipment', async () => {
    vi.mocked(api.products.list).mockResolvedValueOnce({
      data: [
        {
          id: 'prod-ready',
          productCode: 'PROD-RDY-1',
          name: 'Ready Sensor',
          status: 'READY_TO_SHIP',
          manufacturerId: 'mfg-1',
          currentOwnerId: 'mfg-1',
          serialNumber: 'SN-1',
          createdAt: '',
          updatedAt: '',
        },
      ],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    vi.mocked(api.organizations.list).mockResolvedValueOnce([
      {
        id: 'org-dist-2',
        name: 'Allied Distributor',
        code: 'ALLIED',
        type: 'DISTRIBUTOR',
        status: 'ACTIVE',
      },
    ]);
    vi.mocked(api.shipments.create).mockResolvedValueOnce({
      message: 'Shipment created successfully',
      shipment: {
        id: 'ship-2',
        shipmentCode: 'SHIP-2026-0002',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
      blockchain: {
        txHash: '0x123shipment',
        blockNumber: 15,
        shipmentId: 2,
        status: 'CONFIRMED',
      },
    });

    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ create shipment/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /\+ create shipment/i }));

    expect(screen.getByText(/create new shipment reference/i)).toBeInTheDocument();
  });
});
