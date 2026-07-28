'use client';

import React, { useState, useEffect } from 'react';
import { useSiteConfig } from '@/providers/SiteConfigProvider';
import { SiteConfig, CategoryCardItem, HomepageSectionConfig, HeroButtonConfig } from '@/lib/types/site-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Palette, 
  Layout, 
  Image as ImageIcon, 
  Save, 
  MoveUp, 
  MoveDown, 
  Plus, 
  Trash2, 
  Upload, 
  Check, 
  Loader2, 
  Eye, 
  Sparkles, 
  Link as LinkIcon, 
  Type, 
  Layers
} from 'lucide-react';
import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';

export default function BrandRefreshPage() {
  const { config, saveConfig, updatePreviewConfig } = useSiteConfig();
  const [formData, setFormData] = useState<SiteConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingSiteLogo, setIsUploadingSiteLogo] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleBrandingChange = (key: keyof typeof formData.branding, value: string) => {
    const updated = {
      ...formData,
      branding: {
        ...formData.branding,
        [key]: value,
      },
    };
    setFormData(updated);
    updatePreviewConfig(updated);
  };

  const handleHeroChange = (key: keyof typeof formData.hero, value: any) => {
    const updated = {
      ...formData,
      hero: {
        ...formData.hero,
        [key]: value,
      },
    };
    setFormData(updated);
    updatePreviewConfig(updated);
  };

  const handleHeroButtonChange = (index: number, field: keyof HeroButtonConfig, value: string) => {
    const updatedButtons = [...formData.hero.buttons];
    updatedButtons[index] = { ...updatedButtons[index], [field]: value };
    handleHeroChange('buttons', updatedButtons);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage) return;

    setIsUploadingLogo(true);
    try {
      const storageRef = ref(storage, `brand/secondary_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      handleBrandingChange('logoUrl', url);
      toast({ title: 'Image Uploaded', description: 'Secondary brand image saved successfully.' });
    } catch (err: any) {
      console.error('Logo upload error:', err);
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message || 'Failed to upload image.' });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSiteLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage) return;

    setIsUploadingSiteLogo(true);
    try {
      const storageRef = ref(storage, `brand/sitelogo_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      handleBrandingChange('siteLogoUrl', url);
      toast({ title: 'Logo Uploaded', description: 'Website Site Logo saved successfully.' });
    } catch (err: any) {
      console.error('Site logo upload error:', err);
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message || 'Failed to upload logo.' });
    } finally {
      setIsUploadingSiteLogo(false);
    }
  };

  // Section Ordering
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...formData.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    // re-assign order property
    const reordered = newSections.map((sec, idx) => ({ ...sec, order: idx + 1 }));
    const updated = { ...formData, sections: reordered };
    setFormData(updated);
    updatePreviewConfig(updated);
  };

  const updateSection = (secIndex: number, updatedFields: Partial<HomepageSectionConfig>) => {
    const newSections = [...formData.sections];
    newSections[secIndex] = { ...newSections[secIndex], ...updatedFields };
    const updated = { ...formData, sections: newSections };
    setFormData(updated);
    updatePreviewConfig(updated);
  };

  const addItemToSection = (secIndex: number) => {
    const sec = formData.sections[secIndex];
    const newItem: CategoryCardItem = {
      id: `item_${Date.now()}`,
      name: 'New Category',
      href: '/shoes',
      color: 'bg-zinc-900',
    };
    updateSection(secIndex, { items: [...sec.items, newItem] });
  };

  const removeItemFromSection = (secIndex: number, itemIndex: number) => {
    const sec = formData.sections[secIndex];
    const updatedItems = sec.items.filter((_, idx) => idx !== itemIndex);
    updateSection(secIndex, { items: updatedItems });
  };

  const updateSectionItem = (secIndex: number, itemIndex: number, field: keyof CategoryCardItem, value: string) => {
    const sec = formData.sections[secIndex];
    const updatedItems = [...sec.items];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], [field]: value };
    updateSection(secIndex, { items: updatedItems });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const success = await saveConfig(formData);
      if (success) {
        toast({ title: 'Brand Refresh Saved!', description: 'Global theme & homepage settings updated successfully.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message || 'Failed to persist changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Top Header & Sticky Save Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/90 border border-white/10 p-6 rounded-2xl backdrop-blur-md sticky top-4 z-40 shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Brand Refresh & Customizer</h1>
          </div>
          <p className="text-sm text-zinc-400 font-medium mt-1">
            Customize global brand colors, logos, CTA buttons, and drag-and-drop homepage sections.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={() => window.open('/', '_blank')}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Eye className="w-4 h-4 mr-2" /> Live Preview
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-wider px-6"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save & Publish
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="theme" className="w-full">
        <TabsList className="grid grid-cols-3 bg-zinc-900 border border-white/10 p-1 rounded-xl mb-8">
          <TabsTrigger value="theme" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold">
            <Palette className="w-4 h-4 mr-2" /> Global Colors & Logo
          </TabsTrigger>
          <TabsTrigger value="hero" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold">
            <Type className="w-4 h-4 mr-2" /> Hero Banner Text & CTAs
          </TabsTrigger>
          <TabsTrigger value="sections" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold">
            <Layers className="w-4 h-4 mr-2" /> Homepage Sections (Lineup / Card / Vault)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BRAND COLORS & LOGO */}
        <TabsContent value="theme" className="space-y-6">
          <Card className="bg-zinc-900 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase text-primary flex items-center gap-2">
                <Palette className="w-5 h-5" /> Site-Wide Color Palette
              </CardTitle>
              <CardDescription className="text-zinc-400">
                These colors automatically roll out across all pages, buttons, and navigation tickers on Benched.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Primary Color */}
              <div className="space-y-2 bg-black/50 p-4 rounded-xl border border-white/5">
                <Label className="font-bold text-xs uppercase tracking-wider text-zinc-300">Main Primary Brand Color</Label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={formData.branding.primaryColor.startsWith('#') ? formData.branding.primaryColor : '#f26c0d'}
                    onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <Input
                    value={formData.branding.primaryColor}
                    onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                    placeholder="e.g. 25 90% 50% or #f26c0d"
                    className="bg-zinc-950 border-white/10 font-mono text-sm"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">Affects highlights, badges, active links, and brand glows.</p>
              </div>

              {/* Button Color */}
              <div className="space-y-2 bg-black/50 p-4 rounded-xl border border-white/5">
                <Label className="font-bold text-xs uppercase tracking-wider text-zinc-300">Default Button Color</Label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={formData.branding.buttonColor.startsWith('#') ? formData.branding.buttonColor : '#f26c0d'}
                    onChange={(e) => handleBrandingChange('buttonColor', e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <Input
                    value={formData.branding.buttonColor}
                    onChange={(e) => handleBrandingChange('buttonColor', e.target.value)}
                    className="bg-zinc-950 border-white/10 font-mono text-sm"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">Sets the background color for main interactive call-to-action buttons.</p>
              </div>

              {/* Button Text Color */}
              <div className="space-y-2 bg-black/50 p-4 rounded-xl border border-white/5">
                <Label className="font-bold text-xs uppercase tracking-wider text-zinc-300">Button Text Color</Label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={formData.branding.buttonTextColor.startsWith('#') ? formData.branding.buttonTextColor : '#ffffff'}
                    onChange={(e) => handleBrandingChange('buttonTextColor', e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <Input
                    value={formData.branding.buttonTextColor}
                    onChange={(e) => handleBrandingChange('buttonTextColor', e.target.value)}
                    className="bg-zinc-950 border-white/10 font-mono text-sm"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">Sets text color inside main buttons.</p>
              </div>

              {/* Ticker BG Color */}
              <div className="space-y-2 bg-black/50 p-4 rounded-xl border border-white/5">
                <Label className="font-bold text-xs uppercase tracking-wider text-zinc-300">Market Ticker Background</Label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={formData.branding.tickerBgColor.startsWith('#') ? formData.branding.tickerBgColor : '#18181b'}
                    onChange={(e) => handleBrandingChange('tickerBgColor', e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <Input
                    value={formData.branding.tickerBgColor}
                    onChange={(e) => handleBrandingChange('tickerBgColor', e.target.value)}
                    className="bg-zinc-950 border-white/10 font-mono text-sm"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">Custom background color for the live top ticker bar.</p>
              </div>

              {/* Ticker Text Color */}
              <div className="space-y-2 bg-black/50 p-4 rounded-xl border border-white/5">
                <Label className="font-bold text-xs uppercase tracking-wider text-zinc-300">Market Ticker Text Color</Label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={formData.branding.tickerTextColor.startsWith('#') ? formData.branding.tickerTextColor : '#ffffff'}
                    onChange={(e) => handleBrandingChange('tickerTextColor', e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <Input
                    value={formData.branding.tickerTextColor}
                    onChange={(e) => handleBrandingChange('tickerTextColor', e.target.value)}
                    className="bg-zinc-950 border-white/10 font-mono text-sm"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">Custom text color for items scrolling in ticker.</p>
              </div>

            </CardContent>
          </Card>

          {/* Logo Uploader */}
          <Card className="bg-zinc-900 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase text-primary flex items-center gap-2">
                <ImageIcon className="w-5 h-5" /> Brand Logo Manager
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Upload and configure the primary website logo and secondary branding assets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              
              {/* Site Header Logo */}
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-black/50 p-6 rounded-2xl border border-white/5">
                <div className="w-32 h-32 bg-zinc-950 border border-white/10 rounded-2xl flex items-center justify-center relative overflow-hidden shrink-0">
                  <Image
                    src={formData.branding.siteLogoUrl || '/benchedlogo.png'}
                    alt="Website Site Logo"
                    fill
                    className="object-contain p-2"
                  />
                </div>

                <div className="space-y-4 flex-grow w-full">
                  <div className="space-y-1">
                    <Label className="font-bold text-sm text-primary uppercase tracking-wider">Website Site Logo</Label>
                    <p className="text-xs text-zinc-400">This is the main website logo displayed in the header, footer, and navigation. (Max 2MB).</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer bg-primary text-black font-black uppercase text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition">
                      {isUploadingSiteLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {isUploadingSiteLogo ? 'Uploading...' : 'Choose File'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSiteLogoUpload}
                        disabled={isUploadingSiteLogo}
                        className="hidden"
                      />
                    </label>
                    <Input
                      value={formData.branding.siteLogoUrl || ''}
                      onChange={(e) => handleBrandingChange('siteLogoUrl', e.target.value)}
                      placeholder="Or enter image URL (e.g. /benchedlogo.png)"
                      className="bg-zinc-950 border-white/10 font-mono text-xs flex-grow"
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Brand Image */}
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-black/50 p-6 rounded-2xl border border-white/5">
                <div className="w-32 h-32 bg-zinc-950 border border-white/10 rounded-2xl flex items-center justify-center relative overflow-hidden shrink-0">
                  <Image
                    src={formData.branding.logoUrl || '/benched.png'}
                    alt="Secondary Brand Image"
                    fill
                    className="object-contain p-2"
                  />
                </div>

                <div className="space-y-4 flex-grow w-full">
                  <div className="space-y-1">
                    <Label className="font-bold text-sm text-zinc-300 uppercase tracking-wider">Secondary Brand Image</Label>
                    <p className="text-xs text-zinc-400">Used for secondary branding contexts, court graphics, or generic brand placement. (Max 2MB).</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer bg-zinc-800 text-white font-black uppercase text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-zinc-700 transition">
                      {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {isUploadingLogo ? 'Uploading...' : 'Choose File'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isUploadingLogo}
                        className="hidden"
                      />
                    </label>
                    <Input
                      value={formData.branding.logoUrl || ''}
                      onChange={(e) => handleBrandingChange('logoUrl', e.target.value)}
                      placeholder="Or enter image URL (e.g. /benched.png)"
                      className="bg-zinc-950 border-white/10 font-mono text-xs flex-grow"
                    />
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: HERO SECTION EDITOR */}
        <TabsContent value="hero" className="space-y-6">
          <Card className="bg-zinc-900 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase text-primary flex items-center gap-2">
                <Type className="w-5 h-5" /> Front Hero Banner Settings
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Update the main H1 headline, subheadings, and action buttons on the home screen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Headlines */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-wider text-zinc-300">H1 Headline Line 1</Label>
                  <Input
                    value={formData.hero.h1TitleLine1}
                    onChange={(e) => handleHeroChange('h1TitleLine1', e.target.value)}
                    className="bg-zinc-950 border-white/10 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-wider text-zinc-300">H1 Headline Line 2 (Gradient Highlight)</Label>
                  <Input
                    value={formData.hero.h1TitleLine2}
                    onChange={(e) => handleHeroChange('h1TitleLine2', e.target.value)}
                    className="bg-zinc-950 border-white/10 font-bold text-primary"
                  />
                </div>
              </div>

              {/* Subtitles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-wider text-zinc-300">Subtitle Line 1</Label>
                  <Input
                    value={formData.hero.subText1}
                    onChange={(e) => handleHeroChange('subText1', e.target.value)}
                    className="bg-zinc-950 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-wider text-zinc-300">Subtitle Line 2 (Highlighted Text)</Label>
                  <Input
                    value={formData.hero.subText2}
                    onChange={(e) => handleHeroChange('subText2', e.target.value)}
                    className="bg-zinc-950 border-white/10"
                  />
                </div>
              </div>

              {/* Hero CTA Buttons */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <Label className="font-black text-sm uppercase tracking-wider text-primary">Hero CTA Buttons & Links</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {formData.hero.buttons.map((btn, idx) => (
                    <div key={btn.id || idx} className="bg-black/50 p-4 rounded-xl border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-zinc-400">Button #{idx + 1}</span>
                        <input
                          type="color"
                          value={btn.bgColor.startsWith('#') ? btn.bgColor : '#f26c0d'}
                          onChange={(e) => handleHeroButtonChange(idx, 'bgColor', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-0"
                          title="Button Background Color"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-zinc-400">Button Label</Label>
                        <Input
                          value={btn.label}
                          onChange={(e) => handleHeroButtonChange(idx, 'label', e.target.value)}
                          className="bg-zinc-950 border-white/10 text-xs font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-zinc-400">Link Target URL</Label>
                        <Input
                          value={btn.href}
                          onChange={(e) => handleHeroButtonChange(idx, 'href', e.target.value)}
                          className="bg-zinc-950 border-white/10 text-xs font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: DRAG & DROP HOMEPAGE SECTIONS */}
        <TabsContent value="sections" className="space-y-6">
          <Card className="bg-zinc-900 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase text-primary flex items-center gap-2">
                <Layers className="w-5 h-5" /> Drag & Re-order Homepage Sections
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Easily modify "Shop the Lineup", "The Card Room", and "The Vault". Update categories, images, links, and layout styling.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              
              {formData.sections.map((sec, secIdx) => (
                <div 
                  key={sec.id || secIdx} 
                  className="bg-black/60 border border-white/10 rounded-2xl p-6 space-y-6 relative hover:border-white/20 transition shadow-xl"
                >
                  {/* Section Title & Re-order Controls */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => moveSection(secIdx, 'up')}
                          disabled={secIdx === 0}
                          className="h-8 w-8 text-zinc-400 hover:text-white"
                        >
                          <MoveUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => moveSection(secIdx, 'down')}
                          disabled={secIdx === formData.sections.length - 1}
                          className="h-8 w-8 text-zinc-400 hover:text-white"
                        >
                          <MoveDown className="w-4 h-4" />
                        </Button>
                      </div>
                      <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                        <span>Section #{secIdx + 1}:</span>
                        <span className="text-primary">{sec.title}</span>
                      </h3>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-zinc-400 font-bold uppercase">Section Enabled</Label>
                        <Switch
                          checked={sec.enabled}
                          onCheckedChange={(checked) => updateSection(secIdx, { enabled: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section Metadata Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase text-zinc-300">Section Title</Label>
                      <Input
                        value={sec.title}
                        onChange={(e) => updateSection(secIdx, { title: e.target.value })}
                        className="bg-zinc-950 border-white/10 font-bold text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase text-zinc-300">Section Subtitle</Label>
                      <Input
                        value={sec.subtitle || ''}
                        onChange={(e) => updateSection(secIdx, { subtitle: e.target.value })}
                        className="bg-zinc-950 border-white/10 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase text-zinc-300">Custom CSS Classes / Styling</Label>
                      <Input
                        value={sec.customClasses || ''}
                        onChange={(e) => updateSection(secIdx, { customClasses: e.target.value })}
                        placeholder="e.g. py-16 bg-black border-t"
                        className="bg-zinc-950 border-white/10 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Category Card Items */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center">
                      <Label className="font-bold text-xs uppercase tracking-wider text-zinc-400">
                        Category Cards ({sec.items.length} Items)
                      </Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addItemToSection(secIdx)}
                        className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Category Card
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sec.items.map((item, itemIdx) => (
                        <div key={item.id || itemIdx} className="bg-zinc-950 p-4 rounded-xl border border-white/5 space-y-3 relative group">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeItemFromSection(secIdx, itemIdx)}
                            className="h-6 w-6 absolute top-2 right-2 text-zinc-500 hover:text-red-400 opacity-80 group-hover:opacity-100"
                            title="Remove Card"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>

                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-zinc-400">Name / Label</Label>
                            <Input
                              value={item.name}
                              onChange={(e) => updateSectionItem(secIdx, itemIdx, 'name', e.target.value)}
                              className="bg-black border-white/10 text-xs font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-zinc-400">Link Target (href)</Label>
                            <Input
                              value={item.href}
                              onChange={(e) => updateSectionItem(secIdx, itemIdx, 'href', e.target.value)}
                              className="bg-black border-white/10 text-xs font-mono"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-zinc-400">Logo SVG / Image URL</Label>
                              <Input
                                value={item.logo || ''}
                                onChange={(e) => updateSectionItem(secIdx, itemIdx, 'logo', e.target.value)}
                                placeholder="/brand-logos/..."
                                className="bg-black border-white/10 text-[10px] font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-zinc-400">Icon Name (Lucide)</Label>
                              <Input
                                value={item.iconName || ''}
                                onChange={(e) => updateSectionItem(secIdx, itemIdx, 'iconName', e.target.value)}
                                placeholder="Coins, Zap..."
                                className="bg-black border-white/10 text-[10px] font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ))}

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
