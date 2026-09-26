import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WalletManagementPage from '../app/admin/wallets/page';
import { api } from '../lib/api';

vi.mock('../components/Navbar', () => ({ Navbar: () => <nav /> }));
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { role: 'SUPER_ADMIN' }, loading: false }),
}));
vi.mock('../lib/api', () => ({
  api: {
    auth: { listUserWallets: vi.fn(), setUserWallet: vi.fn() },
    organizations: { get: vi.fn() },
  },
}));

describe('wallet management', () => {
  const address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const account = {
    id: 'user-1', email: 'manufacturer@bmost.io', role: 'MANUFACTURER',
    organizationId: 'org-1', walletAddress: null, status: 'ACTIVE',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.auth.listUserWallets).mockResolvedValue([account]);
    vi.mocked(api.organizations.get).mockResolvedValue({
      id: 'org-1', name: 'Apex Tech Manufacturing', code: 'ORG-MFG-001',
      type: 'MANUFACTURER', status: 'ACTIVE', walletAddress: undefined,
    });
    vi.mocked(api.auth.setUserWallet).mockResolvedValue({ ...account, walletAddress: address });
  });

  it('saves the same public address for the user and an organization with no wallet', async () => {
    render(<WalletManagementPage />);

    await screen.findByText('Apex Tech Manufacturing (ORG-MFG-001)');
    fireEvent.change(screen.getByLabelText('Public wallet address'), { target: { value: address } });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึก Wallet' }));

    await waitFor(() => expect(api.auth.setUserWallet).toHaveBeenCalledWith('user-1', address, true));
    expect(await screen.findByRole('status')).toHaveTextContent('บันทึก public wallet address');
  });

  it('does not update the organization wallet unless selected when one already exists', async () => {
    vi.mocked(api.organizations.get).mockResolvedValueOnce({
      id: 'org-1', name: 'Apex Tech Manufacturing', code: 'ORG-MFG-001',
      type: 'MANUFACTURER', status: 'ACTIVE', walletAddress: address,
    });
    render(<WalletManagementPage />);

    await screen.findByText('Apex Tech Manufacturing (ORG-MFG-001)');
    fireEvent.click(screen.getByRole('button', { name: 'บันทึก Wallet' }));

    await waitFor(() => expect(api.auth.setUserWallet).toHaveBeenCalledWith('user-1', address, false));
  });
});
