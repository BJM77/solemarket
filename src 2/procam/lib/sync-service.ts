import { SyncStatus } from '@/samcam/components/sync-status-tracker';
import { db, storage, auth } from '@/samcam/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { PendingUpload } from './sync-storage';
import { DeviceProfile } from '@/samcam/lib/device-detector';
import { deepScanPro } from '@/ai/flows/deep-scan-pro';

export type SyncCallback = (status: SyncStatus) => void;

export interface SyncResult {
  success: boolean;
  aiResult?: Record<string, any>;
  mainUrl?: string;
  secondaryUrl?: string;
  docId?: string;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('FileReader is only available in browser environments'));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export class SyncService {
  private activeSyncs: Map<string, { status: SyncStatus; uploadTasks: any[] }> = new Map();
  
  async processUpload(
    upload: PendingUpload,
    deviceProfile: DeviceProfile,
    onStatusUpdate: SyncCallback
  ): Promise<SyncResult> {
    const id = upload.id;
    
    const status: SyncStatus = {
      id,
      startedAt: new Date().toISOString(),
      currentStep: 0,
      steps: [
        { id: 'auth', label: 'Authenticating...', status: 'pending' },
        { id: 'upload_main', label: 'Uploading Main Image', status: 'pending' },
        { id: 'upload_secondary', label: 'Uploading Detail Image', status: 'pending' },
        { id: 'ai_identify', label: 'AI Product Identification', status: 'pending' },
        { id: 'firestore', label: 'Saving to Database', status: 'pending' },
        { id: 'complete', label: 'Finalizing Sync', status: 'pending' },
      ]
    };
    
    this.activeSyncs.set(id, { status, uploadTasks: [] });
    onStatusUpdate(status);
    
    try {
      // Step 1: Authentication
      await this.updateStep(status, 'auth', 'processing', 'Verifying user session...', onStatusUpdate);
      const user = auth?.currentUser;
      if (!user) {
        await this.updateStep(status, 'auth', 'success', 'Guest Session (Proceeding unauthenticated)', onStatusUpdate);
      } else {
        await this.updateStep(status, 'auth', 'success', `Authenticated as ${user.uid}`, onStatusUpdate);
      }
      
      // Step 2: Upload Main Image
      await this.updateStep(status, 'upload_main', 'processing', 'Uploading Main Image...', onStatusUpdate);
      const mainPath = `raw/procam/${id}_main.jpg`;
      const mainRef = ref(storage, mainPath);
      await this.uploadWithProgress(mainRef, upload.mainBlob, (progress) => {
        const step = status.steps.find(s => s.id === 'upload_main');
        if (step) { step.detail = `Uploading: ${Math.round(progress)}%`; onStatusUpdate({ ...status }); }
      });
      const mainUrl = await getDownloadURL(mainRef);
      await this.updateStep(status, 'upload_main', 'success', `Uploaded`, onStatusUpdate);
      
      // Step 3: Upload Secondary Image
      await this.updateStep(status, 'upload_secondary', 'processing', 'Uploading Detail Image...', onStatusUpdate);
      const secondaryPath = `raw/procam/${id}_secondary.jpg`;
      const secondaryRef = ref(storage, secondaryPath);
      await this.uploadWithProgress(secondaryRef, upload.secondaryBlob, (progress) => {
        const step = status.steps.find(s => s.id === 'upload_secondary');
        if (step) { step.detail = `Uploading: ${Math.round(progress)}%`; onStatusUpdate({ ...status }); }
      });
      const secondaryUrl = await getDownloadURL(secondaryRef);
      await this.updateStep(status, 'upload_secondary', 'success', `Uploaded`, onStatusUpdate);
      
      // Step 4: AI Identification
      await this.updateStep(status, 'ai_identify', 'processing', 'Running AI Vision scan...', onStatusUpdate);
      let aiResult = {};
      try {
        const mainBase64 = await blobToBase64(upload.mainBlob);
        const secondaryBase64 = await blobToBase64(upload.secondaryBlob);
        aiResult = await deepScanPro(mainBase64, secondaryBase64);
        await this.updateStep(status, 'ai_identify', 'success', 'Product identified successfully!', onStatusUpdate);
      } catch (aiErr: any) {
        console.error('AI Identification error:', aiErr);
        await this.updateStep(status, 'ai_identify', 'error', `AI Failed: ${aiErr.message}.`, onStatusUpdate);
      }
      
      // Step 5: Save to Firestore
      await this.updateStep(status, 'firestore', 'processing', 'Saving to Firestore...', onStatusUpdate);
      if (!db) {
        throw new Error('Cloud Firestore database is not initialized');
      }

      const docRef = doc(db, 'pro_imports', id);
      const resData = aiResult as any;
      const isComplete = !!(
        resData &&
        resData.title &&
        resData.price
      );
      const finalStatus = isComplete ? 'VERIFIED' : 'NEEDS_REVIEW';

      await setDoc(docRef, {
        id,
        userId: auth.currentUser?.uid || 'anonymous',
        mainImagePath: mainUrl,
        secondaryImagePath: secondaryUrl,
        status: finalStatus,
        createdAt: upload.createdAt,
        serverTimestamp: serverTimestamp(),
        ...aiResult
      }, { merge: true });
      
      await this.updateStep(status, 'firestore', 'success', `Created import doc: ${id}`, onStatusUpdate);
      
      // Step 6: Complete
      await this.updateStep(status, 'complete', 'processing', 'Cleaning up queue...', onStatusUpdate);
      const { syncStorage } = await import('./sync-storage');
      await syncStorage.remove(id);
      status.completedAt = new Date().toISOString();
      await this.updateStep(status, 'complete', 'success', 'Sync complete!', onStatusUpdate);
      
      this.activeSyncs.delete(id);
      return { success: true, aiResult: aiResult as Record<string, any>, mainUrl, secondaryUrl, docId: id };
      
    } catch (error: any) {
      console.error('[SyncService] Error:', error);
      const currentStep = status.steps.find(s => s.status === 'processing');
      if (currentStep) {
        currentStep.status = 'error';
        currentStep.detail = error.message || 'Unknown error';
      }
      status.error = error.message || 'Sync failed';
      onStatusUpdate({ ...status });
      this.activeSyncs.delete(id);
      return { success: false };
    }
  }
  
  private async updateStep(
    status: SyncStatus,
    stepId: string,
    newStatus: 'idle' | 'pending' | 'processing' | 'success' | 'error',
    detail: string,
    onUpdate: SyncCallback
  ) {
    const step = status.steps.find(s => s.id === stepId);
    if (step) {
      step.status = newStatus;
      step.detail = detail;
      step.timestamp = new Date().toISOString();
      onUpdate({ ...status });
    }
  }
  
  private uploadWithProgress(
    storageRef: any,
    blob: Blob,
    onProgress: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, blob);
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        },
        (error) => {
          reject(error);
        },
        () => {
          resolve('uploaded');
        }
      );
    });
  }
  
  getActiveSyncs(): SyncStatus[] {
    return Array.from(this.activeSyncs.values()).map(s => s.status);
  }
  
  getActiveSync(id: string): SyncStatus | undefined {
    return this.activeSyncs.get(id)?.status;
  }
}

export const syncService = new SyncService();
