'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { sendEmail } from '@/services/email';
import { serializeFirestoreData } from '@/lib/utils';

export async function getEmailLogs(idToken: string, limitCount = 50) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (!['admin', 'superadmin'].includes(decodedToken.role)) {
            throw new Error('Unauthorized');
        }

        const snapshot = await firestoreDb.collection('email_logs')
            .orderBy('timestamp', 'desc')
            .limit(limitCount)
            .get();

        const logs = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return serializeFirestoreData({
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp
            });
        });

        return { success: true, logs };
    } catch (error: any) {
        console.error('Error fetching email logs:', error);
        return { success: false, error: error.message };
    }
}

export async function sendTestEmail(idToken: string, to: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (!['admin', 'superadmin'].includes(decodedToken.role)) {
            throw new Error('Unauthorized');
        }

        const result = await sendEmail({
            to,
            subject: 'Benched System Test Email',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #f26c0d;">Test Successful!</h2>
                    <p>This is a test email sent from the <strong>Benched Admin Dashboard</strong>.</p>
                    <p>If you received this, your SendGrid integration is working correctly.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 10px; color: #999;">Sent at: ${new Date().toLocaleString()}</p>
                </div>
            `
        });

        return result;
    } catch (error: any) {
        console.error('Error sending test email:', error);
        return { success: false, error: error.message };
    }
}
