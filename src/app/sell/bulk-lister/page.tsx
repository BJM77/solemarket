
'use client';

import { useState, useTransition, ChangeEvent, useId } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFieldArray, useForm } from 'react-hook-form';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import {
  Upload,
  Trash2,
  DollarSign,
  Sparkles,
  Loader2,
  Layers,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';
import { uploadImages } from '@/lib/firebase/storage';
import { BeforeUnload } from '@/hooks/use-before-unload';
import type { Product } from '@/lib/types';
import { createProductAction } from '@/app/actions/products';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';


const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const cardSchema = z.object({
  file: z.instanceof(File),
  preview: z.string(),
  price: z.coerce
    .number()
    .positive({ message: 'Price must be a positive number.' }),
});

const formSchema = z.object({
  cards: z.array(cardSchema).min(1, 'Please upload at least one card.'),
});

type CardFormValues = z.infer<typeof cardSchema>;
type BulkListerFormValues = z.infer<typeof formSchema>;

function BulkListerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const fileInputId = useId();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const form = useForm<BulkListerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cards: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'cards',
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newCards = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      price: 0,
    }));
    append(newCards);
  };

  const onSubmit = async (data: BulkListerFormValues) => {
    setIsSubmitting(true);
    setAnalysisProgress(0);

    const idToken = await getCurrentUserIdToken();
    if (!user || !idToken) {
      toast({ title: 'You must be signed in.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    const totalCards = data.cards.length;
    let createdCount = 0;

    for (let i = 0; i < totalCards; i++) {
      const card = data.cards[i];
      try {
        // 1. Get AI suggestions
        const dataUri = await fileToDataUri(card.file);
        const suggestions = await suggestListingDetails({
          photoDataUris: [dataUri],
          idToken,
        });

        // 2. Upload image
        const imageUrls = await uploadImages(
          [card.file],
          `products/${user.uid}`
        );

        // 3. Prepare product data
        const productData: Partial<Product> = {
          title: suggestions.title,
          description: suggestions.description,
          price: card.price,
          category: 'Collector Cards',
          subCategory: suggestions.subCategory,
          condition: suggestions.condition,
          manufacturer: suggestions.manufacturer,
          year: suggestions.year,
          imageUrls,
          quantity: 1,
          isDraft: false,
          status: 'available',
        };

        // 4. Create product via Server Action
        const result = await createProductAction(idToken, productData);
        if (!result.success) {
          throw new Error(result.error);
        }
        createdCount++;
      } catch (error: any) {
        toast({
          title: `Failed to list card ${i + 1}`,
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setAnalysisProgress(((i + 1) / totalCards) * 100);
      }
    }

    setIsSubmitting(false);
    toast({
      title: 'Bulk Listing Complete!',
      description: `${createdCount} out of ${totalCards} cards listed successfully.`,
    });
    router.push('/sell/dashboard');
  };

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="Bulk AI Lister"
        description="Upload photos of your cards, set your prices, and let our AI do the heavy lifting."
      />
      <BeforeUnload when={form.formState.isDirty && !isSubmitting} />

      <Card>
        <CardHeader>
          <CardTitle>Upload Your Cards</CardTitle>
          <CardDescription>
            Select all the card images you want to list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
            onClick={() => document.getElementById(fileInputId)?.click()}
          >
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">
              Click to upload or drag & drop
            </p>
            <p className="text-muted-foreground">PNG, JPG up to 10MB</p>
            <Input
              id={fileInputId}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </CardContent>
      </Card>

      {fields.length > 0 && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
              {fields.map((field, index) => (
                <Card key={field.id} className="relative group">
                  <CardHeader className="p-0">
                    <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg bg-muted">
                      <Image
                        src={field.preview}
                        alt={`Card Preview ${index}`}
                        width={300}
                        height={420}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <FormField
                      control={form.control}
                      name={`cards.${index}.price`}
                      render={({ field: priceField }) => (
                        <FormItem>
                          <FormLabel>Price (AUD)</FormLabel>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-9"
                                {...priceField}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <Button
                type="submit"
                size="lg"
                className="w-full max-w-md h-16 text-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing... (
                    {Math.round(analysisProgress)}
                    %)
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Analyze All & Create Listings
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}

export default BulkListerPage;
