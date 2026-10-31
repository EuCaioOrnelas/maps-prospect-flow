export interface UpdateEntryOnboarding {
  completed_at: string | null;
  skipped: boolean | null;
  role: string | null;
  tour_completed_at: string | null;
  created_at: string;
}

/** Completion during this login never enables automatic updates in this login. */
export function canShowUpdatesOnEntry(
  onboarding: UpdateEntryOnboarding | null,
  signedInAt: string | null | undefined,
): boolean {
  if (!onboarding || !signedInAt) return false;
  const onboardingAt = onboarding.completed_at ??
    (onboarding.skipped && onboarding.role ? onboarding.created_at : null);
  if (!onboardingAt || !onboarding.tour_completed_at) return false;
  const login = Date.parse(signedInAt);
  return Date.parse(onboardingAt) < login && Date.parse(onboarding.tour_completed_at) < login;
}