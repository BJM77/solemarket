import { SyncStatus } from '@/samcam/components/sync-status-tracker';
import { db, storage, auth } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { PendingUpload } from './sync-storage';
import { DeviceProfile } from './device-detector';

export type SyncCallback = (status: SyncStatus) => void;
const INTERNAL_TOKEN = "benched_studio_v4_6_secure";

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
    
    // Initialize status
    const status: SyncStatus = {
      id,
      startedAt: new Date().toISOString(),
      currentStep: 0,
      steps: [
        { id: 'auth', label: 'Authenticating...', status: 'pending' },
        { id: 'upload_front', label: 'Uploading Front Image', status: 'pending' },
        { id: 'upload_back', label: 'Uploading Back Image', status: 'pending' },
        { id: 'ai_identify', label: 'AI Card Identification', status: 'pending' },
        { id: 'firestore', label: 'Saving to Database', status: 'pending' },
        { id: 'complete', label: 'Finalizing Sync', status: 'pending' },
      ]
    };
    
    this.activeSyncs.set(id, { status, uploadTasks: [] });
    onStatusUpdate(status);
    
    try {
      // Step 1: Authentication
      await this.updateStep(status, 'auth', 'processing', 'Verifying user session...', onStatusUpdate);
      
      const user = auth.currentUser;
      if (!user) {
        await this.updateStep(status, 'auth', 'processing', 'No user found, attempting anonymous auth...', onStatusUpdate);
        const { signInAnonymously } = await import('firebase/auth');
        const cred = await signInAnonymously(auth);
        await this.updateStep(status, 'auth', 'success', `Authenticated as ${cred.user.uid}`, onStatusUpdate);
      } else {
        await this.updateStep(status, 'auth', 'success', `Authenticated as ${user.uid}`, onStatusUpdate);
      }
      
      // Step 2: Upload Front Image
      await this.updateStep(status, 'upload_front', 'processing', 'Starting upload...', onStatusUpdate);
      
      const frontPath = `raw/${id}_front.jpg`;
      const frontRef = ref(storage, frontPath);
      
      await this.uploadWithProgress(
        frontRef,
        upload.frontBlob,
        (progress) => {
          const detail = `Uploading: ${Math.round(progress)}%`;
          const step = status.steps.find(s => s.id === 'upload_front');
          if (step) {
            step.detail = detail;
            onStatusUpdate({ ...status });
          }
        }
      );
      
      const frontUrl = await getDownloadURL(frontRef);
      await this.updateStep(status, 'upload_front', 'success', `Uploaded to Storage`, onStatusUpdate);
      
      // Step 3: Upload Back Image
      let backUrl = "";
      if (upload.backBlob) {
        await this.updateStep(status, 'upload_back', 'processing', 'Starting back image upload...', onStatusUpdate);
        
        const backPath = `raw/${id}_back.jpg`;
        const backRef = ref(storage, backPath);
        
        await this.uploadWithProgress(
          backRef,
          upload.backBlob,
          (progress) => {
            const detail = `Uploading back: ${Math.round(progress)}%`;
            const step = status.steps.find(s => s.id === 'upload_back');
            if (step) {
              step.detail = detail;
              onStatusUpdate({ ...status });
            }
          }
        );
        
        backUrl = await getDownloadURL(backRef);
        await this.updateStep(status, 'upload_back', 'success', `Uploaded to Storage`, onStatusUpdate);
      } else {
        await this.updateStep(status, 'upload_back', 'success', 'No back image provided, skipping', onStatusUpdate);
      }
      
      // Step 4: AI Identification
      await this.updateStep(status, 'ai_identify', 'processing', 'Converting image and running AI...', onStatusUpdate);
      
      let aiResult = {};
      try {
        const frontImageBase64 = await blobToBase64(upload.frontBlob);
        const res = await fetch('/samcam/api/identify', {
          method: 'POST',
          headers: { 'X-Benched-Token': INTERNAL_TOKEN, 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId: id, frontImage: frontImageBase64, deviceProfile })
        });
        if (!res.ok) {
          throw new Error(`API returned HTTP ${res.status}`);
        }
        aiResult = await res.json();
        await this.updateStep(status, 'ai_identify', 'success', 'Card identified successfully!', onStatusUpdate);
      } catch (aiErr: any) {
        console.error('AI Identification error:', aiErr);
        await this.updateStep(status, 'ai_identify', 'error', `AI Failed: ${aiErr.message}. Storing card raw.`, onStatusUpdate);
      }
      
      // Step 5: Save to Firestore
      await this.updateStep(status, 'firestore', 'processing', 'Saving metadata and image URLs to Firestore...', onStatusUpdate);
      
      if (!db) {
        throw new Error('Cloud Firestore database is not initialized');
      }

      const docRef = doc(db, 'card_imports', id);
      const resData = aiResult as any;
      const isComplete = !!(
        resData &&
        resData.cardName &&
        resData.setName &&
        resData.sport &&
        resData.year
      );
      const finalStatus = isComplete ? 'VERIFIED' : 'NEEDS_REVIEW';

      await setDoc(docRef, {
        id,
        userId: auth.currentUser?.uid || 'anonymous',
        frontImagePath: frontUrl,
        backImagePath: backUrl,
        status: finalStatus,
        createdAt: upload.createdAt,
        serverTimestamp: serverTimestamp(),
        ...aiResult
      }, { merge: true });
      
      await this.updateStep(status, 'firestore', 'success', `Created card import doc: ${id}`, onStatusUpdate);
      
      // Step 6: Complete
      await this.updateStep(status, 'complete', 'processing', 'Cleaning up queue...', onStatusUpdate);
      
      // Remove from sync queue
      const { syncStorage } = await import('./sync-storage');
      await syncStorage.remove(id);
      
      status.completedAt = new Date().toISOString();
      await this.updateStep(status, 'complete', 'success', 'Sync complete!', onStatusUpdate);
      
      this.activeSyncs.delete(id);
      return true;
      
    } catch (error: any) {
      console.error('[SyncService] Error:', error);
      
      // Mark current step as error
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
