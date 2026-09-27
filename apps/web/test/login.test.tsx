import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '../app/login/page';
import { api, setAuthToken } from '../lib/api';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('../components/Navbar', () => ({
  Navbar: () => <nav data-testid="mock-navbar">Navbar</nav>,
}));

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual('../lib/api');
  return {
    ...actual,
    api: {
      auth: {
        login: vi.fn(),
      },
    },
    setAuthToken: vi.fn(),
  };
});

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with inputs and submit button', () => {
    render(<LoginPage />);

    expect(screen.getByText('Sign In to B-MOST')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('user@organization.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('displays error message when login fails', async () => {
    vi.mocked(api.auth.login).mockRejectedValueOnce(
      new Error('Invalid email or password'),
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('user@organization.com'), {
      target: { value: 'wrong@bmost.io' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('saves auth token and redirects to home on successful login', async () => {
    vi.mocked(api.auth.login).mockResolvedValueOnce({
      accessToken: 'test-jwt-token-12345',
      user: {
        id: 'user-1',
        email: 'admin@bmost.io',
        role: 'SUPER_ADMIN',
      },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('user@organization.com'), {
      target: { value: 'admin@bmost.io' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'SecurePassword123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(api.auth.login).toHaveBeenCalledWith({
        email: 'admin@bmost.io',
        password: 'SecurePassword123!',
      });
      expect(setAuthToken).toHaveBeenCalledWith('test-jwt-token-12345');
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
