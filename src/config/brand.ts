/**
 * Brand Configuration
 * 
 * Centralized configuration for white-label marketplace deployments.
 * All values default to Picksy settings and can be overridden via environment variables.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface CompanyConfig {
    name: string;
    legalName: string;
    abn?: string;
    description: string;
    tagline: string;
    foundedYear: number;
}

export interface BrandingConfig {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl: string;
    logoDarkUrl: string;
    faviconUrl: string;
    ogImageUrl: string;
}

export interface FeatureConfig {
    enableWTB: boolean;
    enableBidsy: boolean;
    enableConsignment: boolean;
    enableVault: boolean;
    enableAIGrading: boolean;
    enablePriceAssistant: boolean;
    enableResearch: boolean;
    enablePartnerProgram: boolean;
}

export interface SEOConfig {
    siteUrl: string;
    siteName: string;
    defaultTitle: string;
    defaultDescription: string;
    keywords: string[];
    twitterHandle: string;
    facebookUrl?: string;
    instagramUrl?: string;
    tiktokUrl?: string;
}

export interface ContactConfig {
    email: string;
    supportEmail: string;
    phone: string;
    address: {
        street?: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
    };
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}

export interface LegalConfig {
    privacyPolicyUrl: string;
    termsOfServiceUrl: string;
    cookiePolicyUrl?: string;
    dmcaUrl: string;
    prohibitedItemsUrl: string;
    safetyTipsUrl: string;
}

export interface IntegrationConfig {
    stripe: {
        publishableKey: string;
        enabled: boolean;
    };
    googleMaps?: {
        apiKey?: string;
        enabled: boolean;
    };
    analytics?: {
        googleAnalyticsId?: string;
        facebookPixelId?: string;
    };
}

export interface BrandConfig {
    company: CompanyConfig;
    branding: BrandingConfig;
    features: FeatureConfig;
    seo: SEOConfig;
    contact: ContactConfig;
    legal: LegalConfig;
    integrations: IntegrationConfig;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get environment variable with fallback
 */
function getEnv(key: string, fallback: string): string {
    return process.env[key] || fallback;
}

/**
 * Get boolean environment variable with fallback
 */
function getEnvBool(key: string, fallback: boolean): boolean {
    const value = process.env[key];
    if (value === undefined) return fallback;
    return value === 'true' || value === '1';
}

/**
 * Get number environment variable with fallback
 */
function getEnvNumber(key: string, fallback: number): number {
    const value = process.env[key];
    if (value === undefined) return fallback;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
}

// ============================================================================
// Configuration
// ============================================================================

export const brandConfig: BrandConfig = {
    // Company Information
    company: {
        name: getEnv('NEXT_PUBLIC_COMPANY_NAME', 'Picksy'),
        legalName: getEnv('COMPANY_LEGAL_NAME', 'Picksy Pty Ltd'),
        abn: process.env.COMPANY_ABN,
        description: getEnv(
            'NEXT_PUBLIC_COMPANY_DESCRIPTION',
            'Australia\'s local marketplace for cards, coins & bullion — Perth-based, with nationwide shipping.'
        ),
        tagline: getEnv(
            'NEXT_PUBLIC_COMPANY_TAGLINE',
            'The Premier Marketplace for Collectors in Australia'
        ),
        foundedYear: getEnvNumber('COMPANY_FOUNDED_YEAR', 2024),
    },

    // Branding & Design
    branding: {
        primaryColor: getEnv('NEXT_PUBLIC_PRIMARY_COLOR', '#FF6B35'),
        secondaryColor: getEnv('NEXT_PUBLIC_SECONDARY_COLOR', '#4ECDC4'),
        accentColor: getEnv('NEXT_PUBLIC_ACCENT_COLOR', '#FFE66D'),
        logoUrl: getEnv('NEXT_PUBLIC_LOGO_URL', '/logo.png'),
        logoDarkUrl: getEnv('NEXT_PUBLIC_LOGO_DARK_URL', '/logo.png'),
        faviconUrl: getEnv('NEXT_PUBLIC_FAVICON_URL', '/favicon.ico'),
        ogImageUrl: getEnv('NEXT_PUBLIC_OG_IMAGE_URL', '/og-image.jpg'),
    },

    // Feature Toggles
    features: {
        enableWTB: getEnvBool('ENABLE_WTB', true),
        enableBidsy: getEnvBool('ENABLE_BIDSY', true),
        enableConsignment: getEnvBool('ENABLE_CONSIGNMENT', true),
        enableVault: getEnvBool('ENABLE_VAULT', true),
        enableAIGrading: getEnvBool('ENABLE_AI_GRADING', true),
        enablePriceAssistant: getEnvBool('ENABLE_PRICE_ASSISTANT', true),
        enableResearch: getEnvBool('ENABLE_RESEARCH', true),
        enablePartnerProgram: getEnvBool('ENABLE_PARTNER_PROGRAM', true),
    },

    // SEO & Social
    seo: {
        siteUrl: getEnv('NEXT_PUBLIC_SITE_URL', 'https://picksy.au'),
        siteName: getEnv('NEXT_PUBLIC_SITE_NAME', 'Picksy'),
        defaultTitle: getEnv(
            'NEXT_PUBLIC_DEFAULT_TITLE',
            'Picksy | The Premier Marketplace for Collectors in Australia'
        ),
        defaultDescription: getEnv(
            'NEXT_PUBLIC_DEFAULT_DESCRIPTION',
            'Buy and sell trading cards, coins, and collectibles. Trusted Australian marketplace with secure payments, verified sellers, and nationwide shipping.'
        ),
        keywords: [
            'trading cards',
            'collectibles',
            'coins',
            'bullion',
            'marketplace',
            'Australia',
            'buy sell',
            'Pokemon cards',
            'NBA cards',
            'NFL cards',
        ],
        twitterHandle: getEnv('NEXT_PUBLIC_TWITTER_HANDLE', '@picksyau'),
        facebookUrl: process.env.NEXT_PUBLIC_FACEBOOK_URL,
        instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
        tiktokUrl: process.env.NEXT_PUBLIC_TIKTOK_URL,
    },

    // Contact Information
    contact: {
        email: getEnv('COMPANY_EMAIL', 'support@picksy.au'),
        supportEmail: getEnv('COMPANY_SUPPORT_EMAIL', 'support@picksy.au'),
        phone: getEnv('COMPANY_PHONE', '+61400000000'),
        address: {
            street: process.env.COMPANY_ADDRESS_STREET,
            city: getEnv('COMPANY_ADDRESS_CITY', 'Perth'),
            state: getEnv('COMPANY_ADDRESS_STATE', 'WA'),
            postcode: getEnv('COMPANY_ADDRESS_POSTCODE', '6000'),
            country: getEnv('COMPANY_ADDRESS_COUNTRY', 'AU'),
        },
        coordinates: process.env.COMPANY_LATITUDE && process.env.COMPANY_LONGITUDE
            ? {
                latitude: parseFloat(process.env.COMPANY_LATITUDE),
                longitude: parseFloat(process.env.COMPANY_LONGITUDE),
            }
            : {
                latitude: -31.9505,
                longitude: 115.8605,
            },
    },

    // Legal Pages
    legal: {
        privacyPolicyUrl: getEnv('LEGAL_PRIVACY_URL', '/privacy'),
        termsOfServiceUrl: getEnv('LEGAL_TERMS_URL', '/terms'),
        cookiePolicyUrl: process.env.LEGAL_COOKIE_URL,
        dmcaUrl: getEnv('LEGAL_DMCA_URL', '/dmca'),
        prohibitedItemsUrl: getEnv('LEGAL_PROHIBITED_URL', '/prohibited-items'),
        safetyTipsUrl: getEnv('LEGAL_SAFETY_URL', '/safety-tips'),
    },

    // Third-Party Integrations
    integrations: {
        stripe: {
            publishableKey: getEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', ''),
            enabled: getEnvBool('ENABLE_STRIPE', true),
        },
        googleMaps: {
            apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
            enabled: getEnvBool('ENABLE_GOOGLE_MAPS', false),
        },
        analytics: {
            googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID,
            facebookPixelId: process.env.NEXT_PUBLIC_FB_PIXEL_ID,
        },
    },
};

// ============================================================================
// Exports
// ============================================================================

export default brandConfig;

// Convenience exports for common values
export const SITE_NAME = brandConfig.company.name;
export const SITE_URL = brandConfig.seo.siteUrl;
export const COMPANY_EMAIL = brandConfig.contact.email;
export const PRIMARY_COLOR = brandConfig.branding.primaryColor;
