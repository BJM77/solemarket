/**
 * Configuration Validator
 * 
 * Validates brand configuration and environment variables to ensure
 * all required settings are properly configured for deployment.
 */

import { brandConfig, type BrandConfig } from '@/config/brand';

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    field: string;
    message: string;
    severity: 'error';
}

export interface ValidationWarning {
    field: string;
    message: string;
    severity: 'warning';
}

type ValidationIssue = ValidationError | ValidationWarning;

/**
 * Validate the entire brand configuration
 */
export function validateConfig(): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Validate company config
    issues.push(...validateCompany(brandConfig.company));

    // Validate branding config
    issues.push(...validateBranding(brandConfig.branding));

    // Validate SEO config
    issues.push(...validateSEO(brandConfig.seo));

    // Validate contact config
    issues.push(...validateContact(brandConfig.contact));

    // Validate integrations
    issues.push(...validateIntegrations(brandConfig.integrations));

    const errors = issues.filter(i => i.severity === 'error') as ValidationError[];
    const warnings = issues.filter(i => i.severity === 'warning') as ValidationWarning[];

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Validate company configuration
 */
function validateCompany(company: BrandConfig['company']): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!company.name || company.name.trim() === '') {
        issues.push({
            field: 'company.name',
            message: 'Company name is required',
            severity: 'error',
        });
    }

    if (!company.description || company.description.trim() === '') {
        issues.push({
            field: 'company.description',
            message: 'Company description is required for SEO',
            severity: 'warning',
        });
    }

    if (company.foundedYear < 1900 || company.foundedYear > new Date().getFullYear()) {
        issues.push({
            field: 'company.foundedYear',
            message: 'Founded year seems invalid',
            severity: 'warning',
        });
    }

    return issues;
}

/**
 * Validate branding configuration
 */
function validateBranding(branding: BrandConfig['branding']): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Validate hex colors
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

    if (!hexColorRegex.test(branding.primaryColor)) {
        issues.push({
            field: 'branding.primaryColor',
            message: 'Primary color must be a valid hex color (e.g., #FF6B35)',
            severity: 'error',
        });
    }

    if (!hexColorRegex.test(branding.secondaryColor)) {
        issues.push({
            field: 'branding.secondaryColor',
            message: 'Secondary color must be a valid hex color',
            severity: 'error',
        });
    }

    // Validate URLs
    if (!branding.logoUrl) {
        issues.push({
            field: 'branding.logoUrl',
            message: 'Logo URL is required',
            severity: 'error',
        });
    }

    if (!branding.faviconUrl) {
        issues.push({
            field: 'branding.faviconUrl',
            message: 'Favicon URL is required',
            severity: 'warning',
        });
    }

    return issues;
}

/**
 * Validate SEO configuration
 */
function validateSEO(seo: BrandConfig['seo']): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Validate site URL
    try {
        const url = new URL(seo.siteUrl);
        if (url.protocol !== 'https:') {
            issues.push({
                field: 'seo.siteUrl',
                message: 'Site URL should use HTTPS for security',
                severity: 'warning',
            });
        }
    } catch {
        issues.push({
            field: 'seo.siteUrl',
            message: 'Site URL must be a valid URL',
            severity: 'error',
        });
    }

    if (!seo.siteName || seo.siteName.trim() === '') {
        issues.push({
            field: 'seo.siteName',
            message: 'Site name is required',
            severity: 'error',
        });
    }

    if (!seo.defaultDescription || seo.defaultDescription.length < 50) {
        issues.push({
            field: 'seo.defaultDescription',
            message: 'Default description should be at least 50 characters for SEO',
            severity: 'warning',
        });
    }

    if (seo.defaultDescription && seo.defaultDescription.length > 160) {
        issues.push({
            field: 'seo.defaultDescription',
            message: 'Default description should be under 160 characters for optimal SEO',
            severity: 'warning',
        });
    }

    return issues;
}

/**
 * Validate contact configuration
 */
function validateContact(contact: BrandConfig['contact']): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact.email)) {
        issues.push({
            field: 'contact.email',
            message: 'Contact email must be a valid email address',
            severity: 'error',
        });
    }

    if (!emailRegex.test(contact.supportEmail)) {
        issues.push({
            field: 'contact.supportEmail',
            message: 'Support email must be a valid email address',
            severity: 'error',
        });
    }

    // Validate phone (basic check)
    if (!contact.phone || contact.phone.trim() === '') {
        issues.push({
            field: 'contact.phone',
            message: 'Contact phone number is recommended',
            severity: 'warning',
        });
    }

    // Validate address
    if (!contact.address.city || !contact.address.state || !contact.address.country) {
        issues.push({
            field: 'contact.address',
            message: 'Complete address is required for local business SEO',
            severity: 'warning',
        });
    }

    return issues;
}

/**
 * Validate integrations
 */
function validateIntegrations(integrations: BrandConfig['integrations']): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Validate Stripe
    if (integrations.stripe.enabled) {
        if (!integrations.stripe.publishableKey) {
            issues.push({
                field: 'integrations.stripe.publishableKey',
                message: 'Stripe publishable key is required when Stripe is enabled',
                severity: 'error',
            });
        }

        if (integrations.stripe.publishableKey && !integrations.stripe.publishableKey.startsWith('pk_')) {
            issues.push({
                field: 'integrations.stripe.publishableKey',
                message: 'Stripe publishable key should start with "pk_"',
                severity: 'error',
            });
        }

        // Check if using test keys in production
        if (integrations.stripe.publishableKey?.startsWith('pk_test_')) {
            issues.push({
                field: 'integrations.stripe.publishableKey',
                message: 'Using Stripe test key - ensure this is intentional',
                severity: 'warning',
            });
        }
    }

    return issues;
}

/**
 * Validate Firebase environment variables
 */
export function validateFirebaseConfig(): ValidationResult {
    const issues: ValidationIssue[] = [];

    const requiredVars = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'NEXT_PUBLIC_FIREBASE_APP_ID',
    ];

    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            issues.push({
                field: varName,
                message: `${varName} is required`,
                severity: 'error',
            });
        }
    }

    // Validate admin SDK vars
    const adminVars = [
        'FIREBASE_ADMIN_PROJECT_ID',
        'FIREBASE_ADMIN_CLIENT_EMAIL',
        'FIREBASE_ADMIN_PRIVATE_KEY',
    ];

    for (const varName of adminVars) {
        if (!process.env[varName]) {
            issues.push({
                field: varName,
                message: `${varName} is required for server-side operations`,
                severity: 'error',
            });
        }
    }

    const errors = issues.filter(i => i.severity === 'error') as ValidationError[];
    const warnings = issues.filter(i => i.severity === 'warning') as ValidationWarning[];

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Get configuration status summary
 */
export function getConfigStatus() {
    const brandValidation = validateConfig();
    const firebaseValidation = validateFirebaseConfig();

    return {
        brand: brandValidation,
        firebase: firebaseValidation,
        overall: {
            isValid: brandValidation.isValid && firebaseValidation.isValid,
            totalErrors: brandValidation.errors.length + firebaseValidation.errors.length,
            totalWarnings: brandValidation.warnings.length + firebaseValidation.warnings.length,
        },
    };
}
