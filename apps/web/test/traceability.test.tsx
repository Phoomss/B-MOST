import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TraceabilityPage from '../app/traceability/page';
import { api, TraceabilityDetailResponse } from '../lib/api';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('../components/Navbar', () => ({
  Navbar: () => <nav data-testid="mock-navbar">Navbar</nav>,
}));

vi.mock('../lib/api', () => ({
  api: {
    traceability: {
      get: vi.fn(),
      search: vi.fn().mockResolvedValue([]),
    },
  },
}));

describe('TraceabilityPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTraceabilityData: TraceabilityDetailResponse = {
    product: {
      id: 'prod-uuid-1',
      productCode: 'PROD-2026-0001',
      serialNumber: 'SN-998877',
      name: 'High Precision Pressure Sensor',
      category: 'Industrial',
      status: 'RECEIVED',
      manufacturerId: 'mfg-1',
      currentOwnerId: 'dist-1',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-05T00:00:00Z',
    },
    manufacturer: {
      id: 'mfg-1',
      name: 'Acme Sensor Labs',
      code: 'ACME',
      type: 'MANUFACTURER',
      status: 'ACTIVE',
    },
    currentOwner: {
      id: 'dist-1',
      name: 'Global Supply Distribution',
      code: 'GSD',
      type: 'DISTRIBUTOR',
      status: 'ACTIVE',
    },
    events: [
      {
        id: 'evt-1',
        eventType: 'PRODUCT_CREATED',
        title: 'Product Registered',
        description: 'Manufactured and registered with hash validation',
        actor: 'Acme Sensor Labs',
        timestamp: '2026-09-01T10:00:00Z',
        badgeColor: 'emerald',
      },
      {
        id: 'evt-2',
        eventType: 'QUALITY_PASSED',
        title: 'Quality Check Passed',
        description: 'Inspection standards ISO-9001 verified',
        actor: 'Independent Auditor',
        timestamp: '2026-09-02T14:30:00Z',
        badgeColor: 'purple',
      },
      {
        id: 'evt-3',
        eventType: 'SHIPMENT_DELIVERED',
        title: 'Shipment Received',
        description: 'Delivered and ownership transferred to distributor',
        actor: 'Global Supply Distribution',
        timestamp: '2026-09-05T09:15:00Z',
        badgeColor: 'blue',
      },
    ],
    ownershipHistory: [
      {
        organizationId: 'mfg-1',
        organizationName: 'Acme Sensor Labs',
        organizationCode: 'ACME',
        organizationType: 'MANUFACTURER',
        acquiredAt: '2026-09-01T10:00:00Z',
        eventDescription: 'Initial Manufacturer',
        isCurrentOwner: false,
      },
      {
        organizationId: 'dist-1',
        organizationName: 'Global Supply Distribution',
        organizationCode: 'GSD',
        organizationType: 'DISTRIBUTOR',
        acquiredAt: '2026-09-05T09:15:00Z',
        eventDescription: 'Shipment Receipt',
        isCurrentOwner: true,
      },
    ],
    blockchainVerification: {
      verified: true,
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      onChainProductId: 1,
      hashMatch: true,
      totalOnChainEvents: 3,
      onChainEvents: [],
    },
  };

  it('renders search input and prompt to look up product traceability', () => {
    render(<TraceabilityPage />);

    expect(screen.getByText('Product Lifecycle Traceability')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter product code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /audit traceability/i })).toBeInTheDocument();
  });

  it('loads and displays product timeline and ownership chain on search', async () => {
    vi.mocked(api.traceability.get).mockResolvedValueOnce(mockTraceabilityData);

    render(<TraceabilityPage />);

    const input = screen.getByPlaceholderText(/enter product code/i);
    fireEvent.change(input, { target: { value: 'PROD-2026-0001' } });
    fireEvent.click(screen.getByRole('button', { name: /audit traceability/i }));

    await waitFor(() => {
      expect(api.traceability.get).toHaveBeenCalledWith('PROD-2026-0001');
      expect(screen.getByText('High Precision Pressure Sensor')).toBeInTheDocument();
      expect(screen.getAllByText('PROD-2026-0001').length).toBeGreaterThan(0);
      expect(screen.getByText('Product Registered')).toBeInTheDocument();
      expect(screen.getByText('Quality Check Passed')).toBeInTheDocument();
      expect(screen.getByText('Shipment Received')).toBeInTheDocument();
      expect(screen.getAllByText('Acme Sensor Labs').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Global Supply Distribution').length).toBeGreaterThan(0);
    });
  });
});
