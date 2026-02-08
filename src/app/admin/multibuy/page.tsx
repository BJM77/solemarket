'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Star, Edit, Percent, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    getMultibuyTemplates,
    createMultibuyTemplate,
    updateMultibuyTemplate,
    deleteMultibuyTemplate,
    setDefaultTemplate,
} from '@/app/actions/multibuy-actions';
import { MultibuyTemplate, MultibuyTier } from '@/types/multibuy';

export default function MultibuyAdminPage() {
    const { toast } = useToast();
    const [templates, setTemplates] = useState<MultibuyTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<MultibuyTemplate | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formTiers, setFormTiers] = useState<MultibuyTier[]>([{ minQuantity: 2, discountPercent: 5 }]);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        const data = await getMultibuyTemplates();
        setTemplates(data);
        setLoading(false);
    };

    const handleOpenDialog = (template?: MultibuyTemplate) => {
        if (template) {
            setEditingTemplate(template);
            setFormName(template.name);
            setFormDescription(template.description);
            setFormTiers(template.tiers);
        } else {
            setEditingTemplate(null);
            setFormName('');
            setFormDescription('');
            setFormTiers([{ minQuantity: 2, discountPercent: 5 }]);
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingTemplate(null);
    };

    const handleAddTier = () => {
        const lastTier = formTiers[formTiers.length - 1];
        const newMinQty = lastTier ? lastTier.minQuantity + 3 : 2;
        const newDiscount = lastTier ? Math.min(lastTier.discountPercent + 5, 50) : 5;
        setFormTiers([...formTiers, { minQuantity: newMinQty, discountPercent: newDiscount }]);
    };

    const handleRemoveTier = (index: number) => {
        if (formTiers.length > 1) {
            setFormTiers(formTiers.filter((_, i) => i !== index));
        }
    };

    const handleTierChange = (index: number, field: 'minQuantity' | 'discountPercent', value: number) => {
        const newTiers = [...formTiers];
        newTiers[index][field] = value;
        setFormTiers(newTiers);
    };

    const handleSave = async () => {
        if (!formName.trim()) {
            toast({ title: 'Name required', variant: 'destructive' });
            return;
        }

        // Sort tiers by quantity
        const sortedTiers = [...formTiers].sort((a, b) => a.minQuantity - b.minQuantity);

        const data = {
            name: formName,
            description: formDescription,
            tiers: sortedTiers,
        };

        let result;
        if (editingTemplate) {
            result = await updateMultibuyTemplate(editingTemplate.id, data);
        } else {
            result = await createMultibuyTemplate(data);
        }

        if (result.success) {
            toast({ title: editingTemplate ? 'Template updated' : 'Template created' });
            handleCloseDialog();
            loadTemplates();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this template?')) return;

        const result = await deleteMultibuyTemplate(id);
        if (result.success) {
            toast({ title: 'Template deleted' });
            loadTemplates();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    };

    const handleSetDefault = async (id: string) => {
        const result = await setDefaultTemplate(id);
        if (result.success) {
            toast({ title: 'Default template updated' });
            loadTemplates();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Package className="h-8 w-8" />
                        Multibuy Discounts
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Create and manage bulk discount templates for sellers
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Template
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
                            <DialogDescription>
                                Define discount tiers for bulk purchases
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="name">Template Name</Label>
                                <Input
                                    id="name"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g., Standard Bulk Discount"
                                />
                            </div>

                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="Brief description of this discount structure"
                                    rows={2}
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <Label>Discount Tiers</Label>
                                    <Button size="sm" variant="outline" onClick={handleAddTier}>
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Tier
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {formTiers.map((tier, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                                            <div className="flex-1">
                                                <Label className="text-xs">Min Quantity</Label>
                                                <Input
                                                    type="number"
                                                    min="2"
                                                    value={tier.minQuantity}
                                                    onChange={(e) => handleTierChange(index, 'minQuantity', parseInt(e.target.value) || 2)}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <Label className="text-xs">Discount %</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max="50"
                                                    value={tier.discountPercent}
                                                    onChange={(e) => handleTierChange(index, 'discountPercent', parseInt(e.target.value) || 1)}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleRemoveTier(index)}
                                                disabled={formTiers.length === 1}
                                                className="mt-5"
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                            <Button onClick={handleSave}>
                                {editingTemplate ? 'Update' : 'Create'} Template
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
            ) : templates.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No templates yet. Create your first one!</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template) => (
                        <Card key={template.id} className="relative">
                            {template.isDefault && (
                                <Badge className="absolute top-4 right-4 bg-yellow-500">
                                    <Star className="h-3 w-3 mr-1" />
                                    Default
                                </Badge>
                            )}
                            <CardHeader>
                                <CardTitle className="text-lg">{template.name}</CardTitle>
                                <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    {template.tiers.map((tier, index) => (
                                        <div key={index} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                                            <span className="font-medium">{tier.minQuantity}+ items</span>
                                            <Badge variant="secondary">
                                                <Percent className="h-3 w-3 mr-1" />
                                                {tier.discountPercent}% off
                                            </Badge>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button size="sm" variant="outline" onClick={() => handleOpenDialog(template)} className="flex-1">
                                        <Edit className="h-3 w-3 mr-1" />
                                        Edit
                                    </Button>
                                    {!template.isDefault && (
                                        <Button size="sm" variant="outline" onClick={() => handleSetDefault(template.id)}>
                                            <Star className="h-3 w-3" />
                                        </Button>
                                    )}
                                    <Button size="sm" variant="outline" onClick={() => handleDelete(template.id)}>
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
