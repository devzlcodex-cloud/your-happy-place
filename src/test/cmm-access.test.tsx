import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthBoundary } from '@/components/cmm/auth-boundary';

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), rpc: vi.fn() }));
vi.mock('@/components/cmm/portal/data', () => ({
  db: {
    rpc: mocks.rpc,
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));
vi.mock('@/components/cmm/portal/portal-shell', () => ({
  PortalShell: () => <div data-testid="authorized-portal" />,
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Corporate access', () => {
  it('never exposes operational children without a session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    render(<AuthBoundary><div data-testid="legacy-operations" /></AuthBoundary>);
    await screen.findByRole('button', { name: 'Entrar', exact: true });
    expect(screen.queryByTestId('legacy-operations')).not.toBeInTheDocument();
    expect(screen.queryByTestId('authorized-portal')).not.toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('requires an authorized profile even when a session exists', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'test-account' } } } });
    mocks.rpc.mockResolvedValue({ data: [{ role: 'unknown' }], error: null });
    render(<AuthBoundary />);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('get_my_profile'));
    await screen.findByRole('button', { name: 'Sair da conta' });
    expect(screen.queryByTestId('authorized-portal')).not.toBeInTheDocument();
  });

  it.each(['gestor', 'financeiro', 'campo'])('admits the authorized %s profile', async (role) => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'test-account' } } } });
    mocks.rpc.mockResolvedValue({ data: [{ role, display_name: 'Teste fictício' }], error: null });
    render(<AuthBoundary />);
    expect(await screen.findByTestId('authorized-portal')).toBeInTheDocument();
  });
});