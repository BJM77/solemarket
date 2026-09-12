'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, AlertTriangle, Settings, Palette, Globe, Mail, Shield } from 'lucide-react';
import { brandConfig } from '@/config/brand';
import { getConfigStatus } from '@/lib/validators/config-validator';

export default function WhiteLabelConfigPage() {
    const [configStatus, setConfigStatus] = useState<any>(null);

    useEffect(() => {
        setConfigStatus(getConfigStatus());
    }, []);

    if (!configStatus) {
        return <div className="p-8">Loading configuration...</div>;
    }

    const { brand, firebase, overall } = configStatus;

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">White-Label Configuration</h1>
                <p className="text-muted-foreground">
                    View and validate your marketplace configuration settings
                </p>
            </div>

            {/* Overall Status */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {overall.isValid ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        Configuration Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="text-2xl font-bold">
                                {overall.isValid ? 'Valid' : 'Invalid'}
                            </div>
                            <div className="text-sm text-muted-foreground">Overall Status</div>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="text-2xl font-bold text-red-500">{overall.totalErrors}</div>
                            <div className="text-sm text-muted-foreground">Errors</div>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="text-2xl font-bold text-yellow-500">{overall.totalWarnings}</div>
                            <div className="text-sm text-muted-foreground">Warnings</div>
                        </div>
                    </div>

                    {/* Errors */}
                    {overall.totalErrors > 0 && (
                        <div className="mt-4 space-y-2">
                            {[...brand.errors, ...firebase.errors].map((error, i) => (
                                <Alert key={i} variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>{error.field}:</strong> {error.message}
                                    </AlertDescription>
                                </Alert>
                            ))}
                        </div>
                    )}

                    {/* Warnings */}
                    {overall.totalWarnings > 0 && (
                        <div className="mt-4 space-y-2">
                            {[...brand.warnings, ...firebase.warnings].map((warning, i) => (
                                <Alert key={i}>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>{warning.field}:</strong> {warning.message}
                                    </AlertDescription>
                                </Alert>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Configuration Tabs */}
            <Tabs defaultValue="company" className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="company">
                        <Settings className="w-4 h-4 mr-2" />
                        Company
                    </TabsTrigger>
                    <TabsTrigger value="branding">
                        <Palette className="w-4 h-4 mr-2" />
                        Branding
                    </TabsTrigger>
                    <TabsTrigger value="seo">
                        <Globe className="w-4 h-4 mr-2" />
                        SEO
                    </TabsTrigger>
                    <TabsTrigger value="contact">
                        <Mail className="w-4 h-4 mr-2" />
                        Contact
                    </TabsTrigger>
                    <TabsTrigger value="integrations">
                        <Shield className="w-4 h-4 mr-2" />
                        Integrations
                    </TabsTrigger>
                </TabsList>

                {/* Company Tab */}
                <TabsContent value="company">
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Information</CardTitle>
                            <CardDescription>Basic company details and settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ConfigItem label="Company Name" value={brandConfig.company.name} />
                            <ConfigItem label="Legal Name" value={brandConfig.company.legalName} />
                            <ConfigItem label="ABN" value={brandConfig.company.abn || 'Not set'} />
                            <ConfigItem label="Description" value={brandConfig.company.description} />
                            <ConfigItem label="Tagline" value={brandConfig.company.tagline} />
                            <ConfigItem label="Founded Year" value={brandConfig.company.foundedYear.toString()} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Branding Tab */}
                <TabsContent value="branding">
                    <Card>
                        <CardHeader>
                            <CardTitle>Branding & Design</CardTitle>
                            <CardDescription>Visual identity and brand assets</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <ColorItem label="Primary Color" color={brandConfig.branding.primaryColor} />
                                <ColorItem label="Secondary Color" color={brandConfig.branding.secondaryColor} />
                                <ColorItem label="Accent Color" color={brandConfig.branding.accentColor} />
                            </div>
                            <ConfigItem label="Logo URL" value={brandConfig.branding.logoUrl} />
                            <ConfigItem label="Dark Logo URL" value={brandConfig.branding.logoDarkUrl} />
                            <ConfigItem label="Favicon URL" value={brandConfig.branding.faviconUrl} />
                            <ConfigItem label="OG Image URL" value={brandConfig.branding.ogImageUrl} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SEO Tab */}
                <TabsContent value="seo">
                    <Card>
                        <CardHeader>
                            <CardTitle>SEO & Social Media</CardTitle>
                            <CardDescription>Search engine and social media settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ConfigItem label="Site URL" value={brandConfig.seo.siteUrl} />
                            <ConfigItem label="Site Name" value={brandConfig.seo.siteName} />
                            <ConfigItem label="Default Title" value={brandConfig.seo.defaultTitle} />
                            <ConfigItem label="Default Description" value={brandConfig.seo.defaultDescription} />
                            <ConfigItem label="Twitter Handle" value={brandConfig.seo.twitterHandle} />
                            <ConfigItem label="Facebook URL" value={brandConfig.seo.facebookUrl || 'Not set'} />
                            <ConfigItem label="Instagram URL" value={brandConfig.seo.instagramUrl || 'Not set'} />
                            <ConfigItem label="TikTok URL" value={brandConfig.seo.tiktokUrl || 'Not set'} />
                            <div>
                                <label className="text-sm font-medium">Keywords</label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {brandConfig.seo.keywords.map((keyword, i) => (
                                        <Badge key={i} variant="secondary">{keyword}</Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Contact Tab */}
                <TabsContent value="contact">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Information</CardTitle>
                            <CardDescription>Company contact details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ConfigItem label="Email" value={brandConfig.contact.email} />
                            <ConfigItem label="Support Email" value={brandConfig.contact.supportEmail} />
                            <ConfigItem label="Phone" value={brandConfig.contact.phone} />
                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-3">Address</h4>
                                <ConfigItem label="Street" value={brandConfig.contact.address.street || 'Not set'} />
                                <ConfigItem label="City" value={brandConfig.contact.address.city} />
                                <ConfigItem label="State" value={brandConfig.contact.address.state} />
                                <ConfigItem label="Postcode" value={brandConfig.contact.address.postcode} />
                                <ConfigItem label="Country" value={brandConfig.contact.address.country} />
                            </div>
                            {brandConfig.contact.coordinates && (
                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3">Coordinates</h4>
                                    <ConfigItem label="Latitude" value={brandConfig.contact.coordinates.latitude.toString()} />
                                    <ConfigItem label="Longitude" value={brandConfig.contact.coordinates.longitude.toString()} />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Integrations Tab */}
                <TabsContent value="integrations">
                    <Card>
                        <CardHeader>
                            <CardTitle>Third-Party Integrations</CardTitle>
                            <CardDescription>API keys and service configurations</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                    Stripe
                                    <Badge variant={brandConfig.integrations.stripe.enabled ? 'default' : 'secondary'}>
                                        {brandConfig.integrations.stripe.enabled ? 'Enabled' : 'Disabled'}
                                    </Badge>
                                </h4>
                                <ConfigItem
                                    label="Publishable Key"
                                    value={brandConfig.integrations.stripe.publishableKey ? '••••••••' + brandConfig.integrations.stripe.publishableKey.slice(-8) : 'Not set'}
                                />
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                    Google Maps
                                    <Badge variant={brandConfig.integrations.googleMaps?.enabled ? 'default' : 'secondary'}>
                                        {brandConfig.integrations.googleMaps?.enabled ? 'Enabled' : 'Disabled'}
                                    </Badge>
                                </h4>
                                <ConfigItem
                                    label="API Key"
                                    value={brandConfig.integrations.googleMaps?.apiKey ? '••••••••' + brandConfig.integrations.googleMaps.apiKey.slice(-8) : 'Not set'}
                                />
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-3">Analytics</h4>
                                <ConfigItem label="Google Analytics ID" value={brandConfig.integrations.analytics?.googleAnalyticsId || 'Not set'} />
                                <ConfigItem label="Facebook Pixel ID" value={brandConfig.integrations.analytics?.facebookPixelId || 'Not set'} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Feature Toggles */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Feature Toggles</CardTitle>
                    <CardDescription>Enabled/disabled features for this deployment</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <FeatureToggle label="WTB" enabled={brandConfig.features.enableWTB} />
                        <FeatureToggle label="Bidsy" enabled={brandConfig.features.enableBidsy} />
                        <FeatureToggle label="Consignment" enabled={brandConfig.features.enableConsignment} />
                        <FeatureToggle label="Vault" enabled={brandConfig.features.enableVault} />
                        <FeatureToggle label="AI Grading" enabled={brandConfig.features.enableAIGrading} />
                        <FeatureToggle label="Price Assistant" enabled={brandConfig.features.enablePriceAssistant} />
                        <FeatureToggle label="Research" enabled={brandConfig.features.enableResearch} />
                        <FeatureToggle label="Partner Program" enabled={brandConfig.features.enablePartnerProgram} />
                    </div>
                </CardContent>
            </Card>

            {/* Setup Instructions */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Setup Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        To customize this configuration for a new deployment:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Copy <code className="bg-muted px-2 py-1 rounded">.env.template</code> to <code className="bg-muted px-2 py-1 rounded">.env.local</code></li>
                        <li>Fill in your company details, Firebase credentials, and Stripe keys</li>
                        <li>Update brand assets in <code className="bg-muted px-2 py-1 rounded">public/</code> directory</li>
                        <li>Review the complete setup guide in <code className="bg-muted px-2 py-1 rounded">docs/WHITE_LABEL_SETUP.md</code></li>
                        <li>Deploy Firebase rules and indexes</li>
                        <li>Build and test locally before deploying</li>
                    </ol>
                </CardContent>
            </Card>
        </div>
    );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
            <div className="text-sm font-medium text-muted-foreground">{label}</div>
            <div className="col-span-2 text-sm break-all">{value}</div>
        </div>
    );
}

function ColorItem({ label, color }: { label: string; color: string }) {
    return (
        <div className="p-4 border rounded-lg">
            <div className="text-sm font-medium mb-2">{label}</div>
            <div className="flex items-center gap-3">
                <div
                    className="w-12 h-12 rounded-lg border-2 border-border"
                    style={{ backgroundColor: color }}
                />
                <code className="text-sm">{color}</code>
            </div>
        </div>
    );
}

function FeatureToggle({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="text-sm font-medium">{label}</span>
            {enabled ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
                <XCircle className="w-5 h-5 text-muted-foreground" />
            )}
        </div>
    );
}
