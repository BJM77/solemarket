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
import { Edit, Loader2 } from 'lucide-react';
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
            <div className="flex justify-end">
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
  );
}
