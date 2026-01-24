// Simple device fingerprinting for fraud prevention
export const generateFingerprint = async (): Promise<string> => {
  try {
    const components: string[] = [];
    
    // Screen dimensions
    components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
    
    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    // Language
    components.push(navigator.language);
    
    // Platform
    components.push(navigator.platform);
    
    // Hardware concurrency
    components.push(String(navigator.hardwareConcurrency || 0));
    
    // Device memory (if available)
    components.push(String((navigator as any).deviceMemory || 0));
    
    // Touch support
    components.push(String('ontouchstart' in window));
    
    // WebGL renderer
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          components.push((gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
      }
    } catch (e) {
      components.push('no-webgl');
    }
    
    // Canvas fingerprint
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('LeadFlux', 2, 2);
        components.push(canvas.toDataURL().slice(-50));
      }
    } catch (e) {
      components.push('no-canvas');
    }
    
    // Create hash from components
    const fingerprint = components.join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36);
  } catch (error) {
    console.error('[Fingerprint] Error generating fingerprint:', error);
    // Return a fallback fingerprint based on basic info
    const fallback = `${navigator.language}-${screen.width}-${Date.now()}`;
    return `fb_${btoa(fallback).slice(0, 12)}`;
  }
};

// Try multiple IP services with fallback
const ipServices = [
  { url: 'https://api.ipify.org?format=json', parser: (data: any) => data.ip },
  { url: 'https://api.ip.sb/ip', parser: (text: string) => text.trim() },
  { url: 'https://icanhazip.com', parser: (text: string) => text.trim() },
];

export const getClientIP = async (): Promise<string> => {
  for (const service of ipServices) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(service.url, { 
        signal: controller.signal,
        mode: 'cors'
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) continue;
      
      const text = await response.text();
      let ip: string;
      
      // Check if response is JSON
      if (service.url.includes('ipify')) {
        try {
          const data = JSON.parse(text);
          ip = service.parser(data);
        } catch {
          continue;
        }
      } else {
        ip = service.parser(text);
      }
      
      // Validate IP format (basic check)
      if (ip && /^[\d.:a-fA-F]+$/.test(ip) && ip.length >= 7) {
        console.log('[Fingerprint] IP obtained from:', service.url);
        return ip;
      }
    } catch (error) {
      console.warn(`[Fingerprint] IP service failed (${service.url}):`, error);
      continue;
    }
  }
  
  console.error('[Fingerprint] All IP services failed');
  return 'unknown';
};