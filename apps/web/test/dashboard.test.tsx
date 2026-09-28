import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '../app/dashboard/page';
import { api, type DashboardCharts, type DashboardStatistics } from '../lib/api';

vi.mock('../components/Navbar', () => ({ Navbar: () => <nav /> }));
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ loading: false, isAuthenticated: true }),
}));
vi.mock('../lib/api', () => ({
  api: {
    dashboard: {
      getStatistics: vi.fn(),
      getCharts: vi.fn(),
      getRecentActivity: vi.fn(),
    },
  },
}));

const statistics: DashboardStatistics = {
  totalProducts: 12,
  inTransit: 3,
  received: 4,
  sold: 2,
  recalled: 1,
  activeShipments: 5,
  blockchainTransactions: 8,
};

const charts: DashboardCharts = {
  productStatus: [],
  shipmentActivity: [],
  organizationActivity: [],
  blockchainActivity: {
    totalTransactions: 8,
    confirmedTransactions: 6,
    pendingTransactions: 2,
    failedTransactions: 0,
    recentTransactions: [],
    dailyTrend: [],
  },
};

describe('dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.dashboard.getStatistics).mockResolvedValue(statistics);
    vi.mocked(api.dashboard.getCharts).mockResolvedValue(charts);
    vi.mocked(api.dashboard.getRecentActivity).mockResolvedValue([]);
  });

  it('shows the original dashboard layout and live figures', async () => {
    render(<DashboardPage />);

    expect(screen.getByRole('heading', { name: 'ภาพรวมระบบห่วงโซ่อุปทาน' })).toBeInTheDocument();
    expect(screen.getByText('EVM Smart Contract ออนไลน์')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'สแกน QR Code' })).toHaveAttribute('href', '/verify');
    const productsCard = await screen.findByRole('link', { name: /สินค้าทั้งหมด/ });
    expect(within(productsCard).getByText('12')).toBeInTheDocument();
  });

  it('lets the user retry a failed data request', async () => {
    vi.mocked(api.dashboard.getStatistics).mockRejectedValueOnce(new Error('Network error'));
    render(<DashboardPage />);

    await screen.findByText('โหลดข้อมูลบางส่วนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    fireEvent.click(screen.getByRole('button', { name: 'ลองใหม่อีกครั้ง' }));
    await waitFor(() => {
      const productsCard = screen.getByRole('link', { name: /สินค้าทั้งหมด/ });
      expect(within(productsCard).getByText('12')).toBeInTheDocument();
    });
    expect(screen.queryByText('โหลดข้อมูลบางส่วนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')).not.toBeInTheDocument();
  });
});
