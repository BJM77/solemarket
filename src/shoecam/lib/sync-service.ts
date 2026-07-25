import { SyncStatus } from '@/samcam/components/sync-status-tracker';
import { db, storage, auth } from '@/samcam/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { PendingUpload } from './sync-storage';
import { DeviceProfile } from '@/samcam/lib/device-detector';
import { deepScanShoe } from '@/ai/flows/deep-scan-shoe';

export type SyncCallback = (status: SyncStatus) => void;

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
  ): Promise<boolean> {
    const id = upload.id;
    
    const status: SyncStatus = {
      id,
      startedAt: new Date().toISOString(),
      currentStep: 0,
      steps: [
        { id: 'auth', label: 'Authenticating...', status: 'pending' },
        { id: 'upload_front45', label: 'Uploading Front 45°', status: 'pending' },
        { id: 'upload_side', label: 'Uploading Side View', status: 'pending' },
        { id: 'upload_top', label: 'Uploading Top View', status: 'pending' },
        { id: 'upload_label', label: 'Uploading Label Image', status: 'pending' },
        { id: 'ai_identify', label: 'AI Shoe Identification', status: 'pending' },
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
      
      // Step 2: Upload Front 45 Image
      await this.updateStep(status, 'upload_front45', 'processing', 'Uploading Front 45...', onStatusUpdate);
      const front45Path = `raw/shoes/${id}_front45.jpg`;
      const front45Ref = ref(storage, front45Path);
      await this.uploadWithProgress(front45Ref, upload.front45Blob, (progress) => {
        const step = status.steps.find(s => s.id === 'upload_front45');
        if (step) { step.detail = `Uploading: ${Math.round(progress)}%`; onStatusUpdate({ ...status }); }
      });
      const front45Url = await getDownloadURL(front45Ref);
      await this.updateStep(status, 'upload_front45', 'success', `Uploaded`, onStatusUpdate);
      
      // Step 3: Upload Side Image
      await this.updateStep(status, 'upload_side', 'processing', 'Uploading Side View...', onStatusUpdate);
      const sidePath = `raw/shoes/${id}_side.jpg`;
      const sideRef = ref(storage, sidePath);
      await this.uploadWithProgress(sideRef, upload.sideBlob, (progress) => {
        const step = status.steps.find(s => s.id === 'upload_side');
        if (step) { step.detail = `Uploading: ${Math.round(progress)}%`; onStatusUpdate({ ...status }); }
      });
      const sideUrl = await getDownloadURL(sideRef);
      await this.updateStep(status, 'upload_side', 'success', `Uploaded`, onStatusUpdate);
      
      // Step 4: Upload Top Image
      await this.updateStep(status, 'upload_top', 'processing', 'Uploading Top View...', onStatusUpdate);
      const topPath = `raw/shoes/${id}_top.jpg`;
      const topRef = ref(storage, topPath);
      await this.uploadWithProgress(topRef, upload.topBlob, (progress) => {
        const step = status.steps.find(s => s.id === 'upload_top');
        if (step) { step.detail = `Uploading: ${Math.round(progress)}%`; onStatusUpdate({ ...status }); }
      });
      const topUrl = await getDownloadURL(topRef);
      await this.updateStep(status, 'upload_top', 'success', `Uploaded`, onStatusUpdate);

      // Step 5: Upload Label Image
      await this.updateStep(status, 'upload_label', 'processing', 'Uploading Label...', onStatusUpdate);
      const labelPath = `raw/shoes/${id}_label.jpg`;
      const labelRef = ref(storage, labelPath);
      await this.uploadWithProgress(labelRef, upload.labelBlob, (progress) => {
        const step = status.steps.find(s => s.id === 'upload_label');
        if (step) { step.detail = `Uploading: ${Math.round(progress)}%`; onStatusUpdate({ ...status }); }
      });
      const labelUrl = await getDownloadURL(labelRef);
      await this.updateStep(status, 'upload_label', 'success', `Uploaded`, onStatusUpdate);
      
      // Step 6: AI Identification (Use inside tag/label image)
      await this.updateStep(status, 'ai_identify', 'processing', 'Running AI Vision scan on tag...', onStatusUpdate);
      let aiResult = {};
      try {
        const labelBase64 = await blobToBase64(upload.labelBlob);
        aiResult = await deepScanShoe(labelBase64);
        await this.updateStep(status, 'ai_identify', 'success', 'Shoe identified successfully!', onStatusUpdate);
      } catch (aiErr: any) {
        console.error('AI Identification error:', aiErr);
        await this.updateStep(status, 'ai_identify', 'error', `AI Failed: ${aiErr.message}.`, onStatusUpdate);
      }
      
      // Step 7: Save to Firestore
      await this.updateStep(status, 'firestore', 'processing', 'Saving to Firestore...', onStatusUpdate);
      if (!db) {
        throw new Error('Cloud Firestore database is not initialized');
      }

      const docRef = doc(db, 'shoe_imports', id);
      const resData = aiResult as any;
      const isComplete = !!(
        resData &&
        resData.brand &&
        resData.model &&
        resData.styleCode
      );
      const finalStatus = isComplete ? 'VERIFIED' : 'NEEDS_REVIEW';

      await setDoc(docRef, {
        id,
        userId: auth.currentUser?.uid || 'anonymous',
        front45ImagePath: front45Url,
        sideImagePath: sideUrl,
        topImagePath: topUrl,
        labelImagePath: labelUrl,
        status: finalStatus,
        createdAt: upload.createdAt,
        serverTimestamp: serverTimestamp(),
        ...aiResult
      }, { merge: true });
      
      await this.updateStep(status, 'firestore', 'success', `Created import doc: ${id}`, onStatusUpdate);
      
      // Step 8: Complete
      await this.updateStep(status, 'complete', 'processing', 'Cleaning up queue...', onStatusUpdate);
      const { syncStorage } = await import('./sync-storage');
      await syncStorage.remove(id);
      status.completedAt = new Date().toISOString();
      await this.updateStep(status, 'complete', 'success', 'Sync complete!', onStatusUpdate);
      
      this.activeSyncs.delete(id);
      return true;
      
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
      return false;
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
