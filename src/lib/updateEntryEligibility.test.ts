import { describe, expect, it } from 'vitest';
import { canShowUpdatesOnEntry, type UpdateEntryOnboarding } from './updateEntryEligibility';

const onboarding: UpdateEntryOnboarding = {
  completed_at: '2026-10-31T11:05:00Z',
  tour_completed_at: '2026-10-31T11:10:00Z',
  skipped: false,
  role: 'owner',
  created_at: '2026-10-31T11:00:00Z',
};
describe('Novidades após o primeiro acesso', () => {
  it('não aparece no primeiro login mesmo depois de terminar onboarding e tour', () => {
    expect(canShowUpdatesOnEntry(onboarding, '2026-10-31T11:00:00Z')).toBe(false);
  });
  it('libera a partir do segundo login depois de concluir ambos', () => {
    expect(canShowUpdatesOnEntry(onboarding, '2026-10-31T12:00:00Z')).toBe(true);
  });
  it('não aparece enquanto o onboarding não está concluído', () => {
    expect(canShowUpdatesOnEntry({ ...onboarding, completed_at: null }, '2026-10-31T12:00:00Z')).toBe(false);
  });
  it('não aparece enquanto o tour não está concluído', () => {
    expect(canShowUpdatesOnEntry({ ...onboarding, tour_completed_at: null }, '2026-10-31T12:00:00Z')).toBe(false);
  });
  it('permanece bloqueado se não conseguir verificar o primeiro acesso', () => {
    expect(canShowUpdatesOnEntry(null, '2026-10-31T12:00:00Z')).toBe(false);
    expect(canShowUpdatesOnEntry(onboarding, null)).toBe(false);
  });
});