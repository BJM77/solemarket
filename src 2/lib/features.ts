/**
 * Feature Flags System
 * 
 * Centralized feature toggles based on brand configuration.
 * Use these flags throughout the app to conditionally render features.
 */

import { brandConfig } from '@/config/brand';

/**
 * Feature flags loaded from brand configuration
 */
export const features = {
    // Marketplace Features
    get wtb() { return brandConfig.features.enableWTB; },
    get bidsy() { return brandConfig.features.enableBidsy; },
    get consignment() { return brandConfig.features.enableConsignment; },
    get vault() { return brandConfig.features.enableVault; },

    // AI Features
    get aiGrading() { return brandConfig.features.enableAIGrading; },
    get priceAssistant() { return brandConfig.features.enablePriceAssistant; },
    get research() { return brandConfig.features.enableResearch; },

    // Business Features
    get partnerProgram() { return brandConfig.features.enablePartnerProgram; },
};

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof features): boolean {
    return features[feature];
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): string[] {
    return Object.entries(features)
        .filter(([_, enabled]) => enabled)
        .map(([name]) => name);
}

/**
 * Get all disabled features
 */
export function getDisabledFeatures(): string[] {
    return Object.entries(features)
        .filter(([_, enabled]) => !enabled)
        .map(([name]) => name);
}

/**
 * Feature-specific helpers
 */
export const featureHelpers = {
    /**
     * Check if WTB (Wanted To Buy) is enabled
     */
    isWTBEnabled: () => features.wtb,

    /**
     * Check if Bidsy (unpriced offers) is enabled
     */
    isBidsyEnabled: () => features.bidsy,

    /**
     * Check if Consignment service is enabled
     */
    isConsignmentEnabled: () => features.consignment,

    /**
     * Check if Vault (authentication) service is enabled
     */
    isVaultEnabled: () => features.vault,

    /**
     * Check if AI Grading is enabled
     */
    isAIGradingEnabled: () => features.aiGrading,

    /**
     * Check if Price Assistant is enabled
     */
    isPriceAssistantEnabled: () => features.priceAssistant,

    /**
     * Check if Research tools are enabled
     */
    isResearchEnabled: () => features.research,

    /**
     * Check if Partner Program is enabled
     */
    isPartnerProgramEnabled: () => features.partnerProgram,
};

export default features;
