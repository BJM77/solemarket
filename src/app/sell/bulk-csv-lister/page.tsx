
'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/layout/PageHeader';
import { uploadImages } from '@/lib/firebase/storage';
import { bulkCreateProductsFromCSV } from '@/app/actions/bulk-products';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { Upload, FileText, CheckCircle, XCircle, Loader2, ListChecks, FileUp, ImageUp } from 'lucide-react';
import { BeforeUnload } from '@/hooks/use-before-unload';

type CSVRow = {
  title: string;
  description: string;
  price: number;
  category: string;
  subCategory?: string;
  condition: string;
  quantity: number;
  imageName: string; // e.g., "charizard.jpg"
};

const REQUIRED_COLUMNS: (keyof CSVRow)[] = ['title', 'description', 'price', 'category', 'condition', 'quantity', 'imageName'];

export default function BulkCsvListerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const [isPending, startTransition] = useTransition();

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageFiles(Array.from(e.target.files || []));
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      setParsedData([]);
      setValidationErrors([]);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          const errors: string[] = [];
          if (results.errors.length > 0) {
            errors.push('CSV parsing failed. Check for formatting errors.');
          }
          const firstRow = results.data[0];
          if (firstRow) {
            for (const col of REQUIRED_COLUMNS) {
              if (!(col in firstRow)) {
                errors.push(`Missing required column: "${col}"`);
              }
            }
          } else {
            errors.push("CSV file is empty or invalid.");
          }

          if (errors.length > 0) {
            setValidationErrors(errors);
            setParsedData([]);
          } else {
            setParsedData(results.data);
          }
        },
      });
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!user) {
      toast({ title: "Authentication required.", variant: "destructive" });
      return;
    }
    if (imageFiles.length === 0 || !csvFile || parsedData.length === 0 || validationErrors.length > 0) {
      toast({ title: "Please complete all steps correctly.", variant: "destructive" });
      return;
    }

    const idToken = await getCurrentUserIdToken();
    if (!idToken) {
      toast({ title: "Session expired. Please sign in again.", variant: "destructive" });
      return;
    }

    // Validate that every row in CSV has a matching image
    const imageNames = new Set(imageFiles.map(f => f.name));
    const missingImages: string[] = [];
    parsedData.forEach((row, index) => {
      if (!imageNames.has(row.imageName)) {
        missingImages.push(`Row ${index + 2}: Image "${row.imageName}" not found in uploaded images.`);
      }
    });

    if (missingImages.length > 0) {
      setValidationErrors(prev => [...prev, ...missingImages]);
      toast({ title: "Image Mismatch", description: "Some images in your CSV were not found.", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      try {
        // 1. Upload all images to storage
        setProgress(10);
        const imageUrlsMap = new Map<string, string>();
        const uploadPath = `products/${user.uid}/bulk-${Date.now()}`;

        // Batch image uploads
        const uploadedUrls = await uploadImages(imageFiles, uploadPath);
        imageFiles.forEach((file, index) => {
          imageUrlsMap.set(file.name, uploadedUrls[index]);
        });
        setProgress(40);

        // 2. Prepare product data
        const productsToCreate = parsedData.map(row => ({
          ...row,
          imageUrls: [imageUrlsMap.get(row.imageName) || ''], // Get the URL, provide fallback
        }));

        // 3. Send to server action for batch Firestore write
        const result = await bulkCreateProductsFromCSV(idToken, productsToCreate);

        if (result.success) {
          setProgress(100);
          toast({
            title: "Success!",
            description: `${result.count} listings were created.`,
          });
          router.push('/sell/dashboard');
        } else {
          throw new Error(result.error);
        }
      } catch (error: any) {
        setProgress(0);
        toast({
          title: "An error occurred",
          description: error.message || "Failed to create listings.",
          variant: "destructive",
        });
      }
    });
  }, [user, imageFiles, csvFile, parsedData, validationErrors, router, toast]);

  const isFormDirty = imageFiles.length > 0 || csvFile !== null;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <BeforeUnload when={isFormDirty && !isPending} />
      <PageHeader
        title="Bulk CSV Lister"
        description="A powerful tool for creating multiple listings from a CSV file."
      />

      <div className="space-y-8 mt-8">
        {/* Step 1: Upload Images */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary p-3 rounded-full">
                <ImageUp className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Step 1: Upload Images</CardTitle>
                <CardDescription>Select all the images referenced in your CSV file.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Input id="image-upload" type="file" multiple accept="image/*" onChange={handleImageUpload} />
            {imageFiles.length > 0 && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm">
                <p className="font-semibold text-green-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {imageFiles.length} image(s) selected.
                </p>
                <ul className="text-xs text-muted-foreground list-disc pl-5 mt-2 max-h-24 overflow-y-auto">
                  {imageFiles.map(f => <li key={f.name}>{f.name}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Upload CSV */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary p-3 rounded-full">
                <FileUp className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Step 2: Upload CSV File</CardTitle>
                <CardDescription>Upload the CSV with your product data.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input id="csv-upload" type="file" accept=".csv" onChange={handleCsvUpload} className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => {
                const csvContent = "title,description,price,category,condition,quantity,imageName\nSample Sneaker,A detailed description of the item.,150,Sneakers,New with Box,1,sample-image.jpg";
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.setAttribute("download", "benched_bulk_upload_template.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}>
                <FileText className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
            <div className="text-xs mt-4 text-muted-foreground p-2 bg-muted/30 rounded">
              Required columns: {REQUIRED_COLUMNS.join(', ')}
            </div>
            {parsedData.length > 0 && (
              <p className="mt-4 font-semibold text-green-600 flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4" />
                {parsedData.length} rows parsed successfully.
              </p>
            )}
            {validationErrors.length > 0 && (
              <div className="mt-4 p-4 bg-destructive/10 text-destructive text-sm rounded-lg">
                <h4 className="font-bold flex items-center gap-2"><XCircle className="h-4 w-4" />Validation Errors:</h4>
                <ul className="list-disc pl-5 mt-2 text-xs">
                  {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Process */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary p-3 rounded-full">
                <ListChecks className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Step 3: Create Listings</CardTitle>
                <CardDescription>Once both files are uploaded and valid, you can create the listings.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={isPending || imageFiles.length === 0 || !csvFile || validationErrors.length > 0}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Create {parsedData.length > 0 ? `${parsedData.length}` : ''} Listings
            </Button>
            {isPending && (
              <div className="mt-4 space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">
                  {progress < 40 ? "Uploading images..." : "Creating listings..."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
