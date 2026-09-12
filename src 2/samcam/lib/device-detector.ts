export interface DeviceProfile {
  name: string;
  manufacturer: string;
  model: string;
  isHighEnd: boolean;
  hasMacroMode: boolean;
  hasNightMode: boolean;
  recommendedAspectRatio: string;
  recommendedResolution: { width: number; height: number };
  aiAcceleration: 'none' | 'basic' | 'full';
}

export function detectDevice(): DeviceProfile {
  if (typeof window === 'undefined') {
    return getFallbackProfile();
  }

  const ua = navigator.userAgent;
  
  // Detect manufacturer
  let manufacturer = 'generic';
  if (ua.includes('Samsung') || ua.includes('SM-')) manufacturer = 'samsung';
  else if (ua.includes('Pixel') || ua.includes('Android') && ua.includes('Google')) manufacturer = 'google';
  else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('Macintosh')) manufacturer = 'apple';
  else if (ua.includes('OnePlus')) manufacturer = 'oneplus';
  
  // Detect model (simplified)
  let model = 'unknown';
  if (manufacturer === 'samsung') {
    const match = ua.match(/SM-([A-Z0-9]+)/);
    if (match) model = `Galaxy ${match[1]}`;
    else model = 'Galaxy Device';
  } else if (manufacturer === 'google') {
    const match = ua.match(/Pixel (\d+)/);
    if (match) model = `Pixel ${match[1]}`;
    else model = 'Pixel Device';
  } else if (manufacturer === 'apple') {
    if (ua.includes('iPhone')) model = 'iPhone';
    else if (ua.includes('iPad')) model = 'iPad';
  }
  
  // Determine capabilities
  const isHighEnd = manufacturer === 'samsung' || 
                   manufacturer === 'google' || 
                   manufacturer === 'apple';
  
  // Check for macro support (Pixel has it, newer Samsung flagships have it)
  const hasMacroMode = manufacturer === 'google' || 
                       (manufacturer === 'samsung' && (ua.includes('SM-G9') || ua.includes('SM-S9'))); // S series flagships
  
  const hasNightMode = manufacturer === 'google' || 
                       manufacturer === 'apple' || 
                       (manufacturer === 'samsung' && (ua.includes('SM-G9') || ua.includes('SM-S9')));
  
  return {
    name: `${manufacturer.charAt(0).toUpperCase() + manufacturer.slice(1)} ${model}`,
    manufacturer,
    model,
    isHighEnd,
    hasMacroMode,
    hasNightMode,
    recommendedAspectRatio: manufacturer === 'apple' ? '4:3' : '16:9',
    recommendedResolution: manufacturer === 'apple' ? 
      { width: 1920, height: 1440 } : 
      { width: 1920, height: 1080 },
    aiAcceleration: isHighEnd ? 'full' : 'basic',
  };
}

export function getProfileForPreset(presetId: string): DeviceProfile {
  switch (presetId) {
    case 'samsung':
      return {
        name: 'Samsung Galaxy Preset',
        manufacturer: 'samsung',
        model: 'Preset',
        isHighEnd: true,
        hasMacroMode: true,
        hasNightMode: true,
        recommendedAspectRatio: '16:9',
        recommendedResolution: { width: 1920, height: 1080 },
        aiAcceleration: 'full',
      };
    case 'google':
      return {
        name: 'Google Pixel Preset',
        manufacturer: 'google',
        model: 'Preset',
        isHighEnd: true,
        hasMacroMode: true,
        hasNightMode: true,
        recommendedAspectRatio: '16:9',
        recommendedResolution: { width: 1920, height: 1080 },
        aiAcceleration: 'full',
      };
    case 'apple':
      return {
        name: 'Apple iPhone Preset',
        manufacturer: 'apple',
        model: 'Preset',
        isHighEnd: true,
        hasMacroMode: false,
        hasNightMode: true,
        recommendedAspectRatio: '4:3',
        recommendedResolution: { width: 1920, height: 1440 },
        aiAcceleration: 'full',
      };
    case 'oneplus':
      return {
        name: 'OnePlus Preset',
        manufacturer: 'oneplus',
        model: 'Preset',
        isHighEnd: false,
        hasMacroMode: false,
        hasNightMode: false,
        recommendedAspectRatio: '16:9',
        recommendedResolution: { width: 1920, height: 1080 },
        aiAcceleration: 'basic',
      };
    case 'generic':
    default:
      return getFallbackProfile();
  }
}

function getFallbackProfile(): DeviceProfile {
  return {
    name: 'Generic Device',
    manufacturer: 'generic',
    model: 'unknown',
    isHighEnd: false,
    hasMacroMode: false,
    hasNightMode: false,
    recommendedAspectRatio: '16:9',
    recommendedResolution: { width: 1920, height: 1080 },
    aiAcceleration: 'basic',
  };
}
