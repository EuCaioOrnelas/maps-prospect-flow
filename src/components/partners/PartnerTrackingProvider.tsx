import { ReactNode } from "react";
import { usePartnerTracking } from "@/hooks/usePartnerTracking";

/**
 * Wrap any route that should capture ?ref= referral attribution.
 * Last-click model: latest ?ref= overrides the previous one.
 */
export const PartnerTrackingProvider = ({ children }: { children: ReactNode }) => {
  usePartnerTracking();
  return <>{children}</>;
};
