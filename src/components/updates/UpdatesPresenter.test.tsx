import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdatesPresenter } from './UpdatesPresenter';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), maybeSingle: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user' }, session: null }) }));
vi.mock('@/hooks/useGuidedTour', () => ({ useGuidedTour: () => ({ isActive: false }) }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, info: mocks.info } }));
vi.mock('@/lib/updateMedia', () => ({ clearUpdateMediaCache: vi.fn(), prepareUpdateMedia: vi.fn().mockResolvedValue(undefined), waitForUpdateMedia: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }),
} }));
vi.mock('./UpdateModal', () => ({ UpdateModal: ({ item }: { item: { title: string } | null }) => item ? <div role="dialog">{item.title}</div> : null }));

describe('manual update reopening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: { id: 'notice', title: 'Projetos' }, error: null });
  });
  it('opens from an admin notification without requesting automatic updates', async () => {
    render(<MemoryRouter initialEntries={['/admin/announcements']}><UpdatesPresenter automaticDisabled /></MemoryRouter>);
    await act(async () => { window.dispatchEvent(new CustomEvent('wiize:open-update', { detail: 'notice' })); });
    expect(await screen.findByRole('dialog')).toHaveTextContent('Projetos');
    expect(mocks.rpc).toHaveBeenCalledWith('updates_record_event', expect.objectContaining({ _id: 'notice', _event: 'view', _automatic: false }));
    expect(mocks.rpc).toHaveBeenCalledWith('updates_record_event', expect.objectContaining({ _event: 'reopen' }));
    expect(mocks.rpc).not.toHaveBeenCalledWith('updates_list_due');
  });
  it('still opens on bell click when the automatic rule rejects the view', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    render(<MemoryRouter><UpdatesPresenter automaticDisabled /></MemoryRouter>);
    await act(async () => { window.dispatchEvent(new CustomEvent('wiize:open-update', { detail: 'notice' })); });
    expect(await screen.findByRole('dialog')).toHaveTextContent('Projetos');
    expect(mocks.error).not.toHaveBeenCalled();
  });
  it('reports an unavailable notice instead of silently ignoring the click', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    render(<MemoryRouter><UpdatesPresenter automaticDisabled /></MemoryRouter>);
    await act(async () => { window.dispatchEvent(new CustomEvent('wiize:open-update', { detail: 'notice' })); });
    await waitFor(() => expect(mocks.info).toHaveBeenCalled());
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});