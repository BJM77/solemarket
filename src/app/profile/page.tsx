'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/firebase';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, ShoppingBag, AlertTriangle, MessageSquare, Loader2, Edit } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/lib/firebase/client-ops';
import { useState, useEffect, useTransition } from 'react';

const profileSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters.'),
  bio: z.string().max(160, 'Bio cannot be longer than 160 characters.').optional(),
  storeName: z.string().min(2, 'Store name must be at least 2 characters.').optional(),
  storeDescription: z.string().max(500, 'Description cannot exceed 500 characters.').optional(),
  bannerUrl: z.string().url('Please enter a valid URL.').or(z.literal('')).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileDetailsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      bio: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || '',
        bio: (user as any).bio || '',
        storeName: (user as any).storeName || '',
        storeDescription: (user as any).storeDescription || '',
        bannerUrl: (user as any).bannerUrl || '',
      });
    }
  }, [user, form]);

  const onSubmit = (data: ProfileFormValues) => {
    if (!user) {
      toast({ title: 'You must be signed in', variant: 'destructive' });
      return;
    }

    startTransition(async () => {
      try {
        await updateUserProfile(user, data);
        toast({ title: 'Profile updated successfully!' });
      } catch (error: any) {
        toast({
          title: 'Failed to update profile',
          description: error.message,
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Public Profile</CardTitle>
          <CardDescription>
            This is how others will see you on the site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your display name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Email</FormLabel>
                  <Input value={user?.email || ''} readOnly disabled />
                </div>
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us a little about your collection."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-4 text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  Storefront Branding
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="storeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Store Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Rare Card Vault" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bannerUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banner Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="storeDescription"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Store Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your shop to potential buyers."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                <Button variant="outline" asChild className="gap-2">
                  <Link href={`/shop/${user?.uid}`}>
                    <ShoppingBag className="h-4 w-4" />
                    View My Shop
                  </Link>
                </Button>
                <Button type="submit" disabled={isPending || !form.formState.isValid}>
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Edit className="mr-2 h-4 w-4" />
                  )}
                  Update Profile
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
