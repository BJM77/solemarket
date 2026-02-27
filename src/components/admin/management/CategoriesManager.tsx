
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useUser } from '@/firebase';
import type { Category } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { createCategory, updateCategory, deleteCategory } from '@/app/actions/admin-categories';

const categorySchema = z.object({
  name: z.string().min(2, 'Category name is required.'),
  section: z.string().min(2, 'Section slug is required (e.g., collector-cards).'),
  href: z.string().min(1, 'Href is required (e.g., /collector-cards/sports).'),
  showOnHomepage: z.boolean().default(false),
  showInNav: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  order: z.number().int().default(0)
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      section: '',
      href: '',
      showOnHomepage: false,
      showInNav: true,
      isPopular: false,
      order: 0
    },
  });

  useEffect(() => {
    if (!firestore) return;
    const q = query(collection(firestore, 'categories'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      // Client-side sort by order
      cats.sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(cats);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching categories: ", error);
      toast({ title: 'Failed to load categories.', description: error.message, variant: 'destructive' });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [firestore, toast]);

  useEffect(() => {
    if (editingCategory) {
      form.reset({
        name: editingCategory.name,
        section: editingCategory.section,
        href: editingCategory.href || '',
        showOnHomepage: editingCategory.showOnHomepage || false,
        showInNav: editingCategory.showInNav !== false,
        isPopular: editingCategory.isPopular || false,
        order: editingCategory.order || 0
      });
    } else {
      form.reset({
        name: '',
        section: '',
        href: '',
        showOnHomepage: false,
        showInNav: true,
        isPopular: false,
        order: 0
      });
    }
  }, [editingCategory, form]);

  const onSubmit = async (values: CategoryFormValues) => {
    setIsSubmitting(true);
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Authentication required');

      if (editingCategory) {
        await updateCategory(editingCategory.id, values, token);
        toast({ title: 'Category updated successfully!' });
        setEditingCategory(null);
      } else {
        await createCategory(values, token);
        toast({ title: 'Category added successfully!' });
      }
      form.reset();
    } catch (error: any) {
      toast({ title: 'An error occurred.', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCategoryHandler = async (id: string) => {
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Authentication required');

      await deleteCategory(id, token);
      toast({ title: 'Category deleted successfully.' });
    } catch (error: any) {
      toast({ title: 'Failed to delete category.', description: error.message, variant: 'destructive' });
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g., Sports Cards" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="section" render={({ field }) => (
                  <FormItem><FormLabel>Section Slug</FormLabel><FormControl><Input placeholder="e.g., collector-cards" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="href" render={({ field }) => (
                  <FormItem><FormLabel>Link Href</FormLabel><FormControl><Input placeholder="e.g., /collector-cards/sports" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="order" render={({ field }) => (
                  <FormItem><FormLabel>Display Order</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="flex flex-col gap-4 py-2">
                  <FormField control={form.control} name="showOnHomepage" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Show on Homepage</FormLabel>
                      </div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="showInNav" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Show in Nav Menu</FormLabel>
                      </div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="isPopular" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Mark as Popular</FormLabel>
                      </div>
                    </FormItem>
                  )} />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </Button>
                {editingCategory && (
                  <Button variant="outline" className="w-full" onClick={() => setEditingCategory(null)}>Cancel Edit</Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card>
          <CardHeader><CardTitle>Existing Categories</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Href</TableHead>
                    <TableHead>Homepage</TableHead>
                    <TableHead>Nav</TableHead>
                    <TableHead>Popular</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>{cat.section}</TableCell>
                      <TableCell>{cat.href}</TableCell>
                      <TableCell>{cat.showOnHomepage ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{cat.showInNav !== false ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{cat.isPopular ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{cat.order || 0}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditingCategory(cat)}><Edit className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the category.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCategoryHandler(cat.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
