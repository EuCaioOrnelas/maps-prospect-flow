import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Generate a unique session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('landing_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('landing_session_id', sessionId);
  }
  return sessionId;
};

// Store the landing page slug for later use
export const setLandingPageSlug = (slug: string) => {
  sessionStorage.setItem('landing_page_slug', slug);
  // Also store in localStorage for persistence across sessions
  localStorage.setItem('landing_page_slug', slug);
};

export const getLandingPageSlug = (): string => {
  // Try sessionStorage first, then localStorage
  return sessionStorage.getItem('landing_page_slug') || 
         localStorage.getItem('landing_page_slug') || 
         'index';
};

// Store the landing page ID for faster lookups
const setLandingPageId = (id: string) => {
  sessionStorage.setItem('landing_page_id', id);
  localStorage.setItem('landing_page_id', id);
};

const getLandingPageId = (): string | null => {
  return sessionStorage.getItem('landing_page_id') || 
         localStorage.getItem('landing_page_id');
};

export const useLandingPageTracking = (pageSlug: string = 'index') => {
  const hasTrackedPageView = useRef(false);
  const sessionId = getSessionId();

  // Track page view on mount - use sessionStorage to prevent duplicate tracking across remounts
  useEffect(() => {
    const trackingKey = `tracked_page_view_${pageSlug}`;
    const alreadyTracked = sessionStorage.getItem(trackingKey);
    
    if (hasTrackedPageView.current || alreadyTracked) return;
    hasTrackedPageView.current = true;
    sessionStorage.setItem(trackingKey, 'true');

    // Store the slug for later use (signup, purchase, etc.)
    setLandingPageSlug(pageSlug);

    const trackPageView = async () => {
      try {
        // Get the landing page ID
        const { data: page } = await supabase
          .from('landing_pages')
          .select('id')
          .eq('slug', pageSlug)
          .eq('is_active', true)
          .maybeSingle();

        if (!page) return;

        // Store the page ID for faster lookups
        setLandingPageId(page.id);

        // Insert page view event
        await supabase.from('landing_page_events').insert({
          landing_page_id: page.id,
          event_type: 'page_view',
          session_id: sessionId,
        });
      } catch (error) {
        console.error('Error tracking page view:', error);
      }
    };

    // Performance: o page view não faz parte do conteúdo crítico. Roda em idle,
    // depois do primeiro paint, para não competir com a renderização do hero.
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(() => void trackPageView(), { timeout: 3000 });
    } else {
      window.setTimeout(() => void trackPageView(), 1200);
    }
  }, [pageSlug, sessionId]);

  // Track signup button click
  const trackSignupClick = useCallback(async () => {
    try {
      // Try to use stored page ID first for performance
      let pageId = getLandingPageId();
      
      if (!pageId) {
        const { data: page } = await supabase
          .from('landing_pages')
          .select('id')
          .eq('slug', pageSlug)
          .eq('is_active', true)
          .maybeSingle();

        if (!page) return;
        pageId = page.id;
        setLandingPageId(pageId);
      }

      await supabase.from('landing_page_events').insert({
        landing_page_id: pageId,
        event_type: 'signup_click',
        session_id: sessionId,
      });
    } catch (error) {
      console.error('Error tracking signup click:', error);
    }
  }, [pageSlug, sessionId]);

  return { trackSignupClick, sessionId };
};

// Helper to track signup completion (called from Signup page after successful signup)
export const trackSignupCompleted = async (userId: string, metaSlug?: string) => {
  const sessionId = getSessionId();
  const pageSlug = metaSlug || getLandingPageSlug();
  let pageId = getLandingPageId();

  try {
    // Get page ID if not cached
    if (!pageId) {
      const { data: page } = await supabase
        .from('landing_pages')
        .select('id')
        .eq('slug', pageSlug)
        .maybeSingle();

      if (!page) {
        // Fallback to index page
        const { data: indexPage } = await supabase
          .from('landing_pages')
          .select('id')
          .eq('slug', 'index')
          .maybeSingle();
        
        if (!indexPage) return;
        pageId = indexPage.id;
      } else {
        pageId = page.id;
      }
    }

    // Insert signup completed event
    await supabase.from('landing_page_events').insert({
      landing_page_id: pageId,
      event_type: 'signup_completed',
      session_id: sessionId,
      user_id: userId,
    });

    // Link user to landing page source
    await supabase.from('user_landing_source').insert({
      user_id: userId,
      landing_page_id: pageId,
      session_id: sessionId,
    });
    
    console.log('Signup tracked successfully for landing page:', pageSlug);
  } catch (error) {
    console.error('Error tracking signup completion:', error);
  }
};

// Helper to track purchase (called from checkout success or webhook)
export const trackPurchase = async (userId: string, plan: string, amount: number) => {
  try {
    // Get user's landing source
    const { data: source } = await supabase
      .from('user_landing_source')
      .select('landing_page_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!source?.landing_page_id) return;

    await supabase.from('landing_page_events').insert({
      landing_page_id: source.landing_page_id,
      event_type: 'purchase',
      user_id: userId,
      metadata: { plan, amount },
    });
  } catch (error) {
    console.error('Error tracking purchase:', error);
  }
};

// Track trial users who didn't upgrade
export const trackTrialNoUpgrade = async (userId: string) => {
  try {
    const { data: source } = await supabase
      .from('user_landing_source')
      .select('landing_page_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!source?.landing_page_id) return;

    await supabase.from('landing_page_events').insert({
      landing_page_id: source.landing_page_id,
      event_type: 'trial_no_upgrade',
      user_id: userId,
    });
  } catch (error) {
    console.error('Error tracking trial no upgrade:', error);
  }
};
