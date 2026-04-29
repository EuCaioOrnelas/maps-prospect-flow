import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  FeatureKey,
  profileHasFeature,
  getFeatureForPath,
} from "@/lib/featurePermissions";

interface FeatureProfile {
  is_custom_subscription: boolean | null;
  custom_feature_permissions: any;
}

/**
 * Returns custom-permission state for the current user.
 *  - loading: while we fetch the profile
 *  - hasFeature(key): boolean check
 *  - hasPathAccess(pathname): boolean check based on FEATURE_CATALOG
 */
export function useFeatureAccess() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FeatureProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("is_custom_subscription, custom_feature_permissions")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setProfile((data as FeatureProfile) || { is_custom_subscription: false, custom_feature_permissions: null });
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const hasFeature = (key: FeatureKey) => profileHasFeature(profile, key);
  const hasPathAccess = (pathname: string) => {
    const feat = getFeatureForPath(pathname);
    if (!feat) return true;
    return profileHasFeature(profile, feat);
  };

  return { loading, profile, hasFeature, hasPathAccess };
}
