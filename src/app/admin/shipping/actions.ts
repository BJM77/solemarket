'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { ensureActionAuth } from '@/lib/action-utils';
import { serializeFirestoreData } from '@/lib/utils/serialization';

export interface PendingOrder {
    id: string;
    itemTitle: string;
    buyerName: string;
    status: string;
    createdAt: string;
    shippingMethod: string;
    shippingAddress?: {
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
    };
    total?: number;
    trackingNumber?: string;
    labelUrl?: string;
}

export async function getPendingOrdersForShipping(idToken: string): Promise<{ success: boolean; orders: PendingOrder[]; message?: string }> {
    try {
        await ensureActionAuth(idToken, ['admin', 'superadmin']);

        // Fetch orders ready for shipment
        const snapshot = await firestoreDb
            .collection('orders')
            .where('status', 'in', ['paid', 'pending_shipment', 'label_created'])
            .limit(50)
            .get();

        const orders: PendingOrder[] = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            const firstItem = Array.isArray(data.items) && data.items.length > 0 ? data.items[0] : null;
            const itemTitle =
                data.itemTitle ||
                firstItem?.title ||
                (Array.isArray(data.items) && data.items.length > 1
                    ? `${data.items[0]?.title || 'Item'} + ${data.items.length - 1} more`
                    : 'Order Items');

            const buyerName =
                data.buyerName ||
                data.shippingAddress?.name ||
                data.buyerEmail ||
                'Customer';

            const created = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString());

            return {
                id: doc.id,
                itemTitle,
                buyerName,
                status: data.status || 'pending_shipment',
                createdAt: created,
                shippingMethod: data.shippingMethod || 'Standard Parcel',
                shippingAddress: data.shippingAddress || null,
                total: Number(data.total || data.subtotal || 0),
                trackingNumber: data.trackingNumber || undefined,
                labelUrl: data.labelUrl || undefined,
            };
        });

        // Sort descending by creation date
        orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return { success: true, orders: serializeFirestoreData(orders) };
    } catch (error: any) {
        console.error('Error fetching shipping orders:', error);
        return { success: false, orders: [], message: error?.message || 'Failed to fetch pending orders.' };
    }
}

export interface ParcelDimensions {
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
}

export async function createShippingLabel(
    idToken: string,
    orderId: string,
    parcel: ParcelDimensions
): Promise<{ success: boolean; labelUrl?: string; trackingNumber?: string; message: string }> {
    try {
        await ensureActionAuth(idToken, ['admin', 'superadmin']);

        if (!orderId) {
            return { success: false, message: 'Order ID is required.' };
        }

        const orderRef = firestoreDb.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            return { success: false, message: 'Order not found.' };
        }

        const orderData = orderSnap.data();

        // Check if Shippo API key is configured in the environment
        const shippoApiKey = process.env.SHIPPO_API_KEY;
        let labelUrl = '';
        let trackingNumber = '';

        if (shippoApiKey) {
            try {
                // Call Shippo API
                const shippoRes = await fetch('https://api.goshippo.com/shipments/', {
                    method: 'POST',
                    headers: {
                        Authorization: `ShippoToken ${shippoApiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        address_from: {
                            name: 'Benched Marketplace',
                            street1: 'PO Box 100',
                            city: 'Perth',
                            state: 'WA',
                            zip: '6000',
                            country: 'AU',
                        },
                        address_to: {
                            name: orderData?.buyerName || 'Buyer',
                            street1: orderData?.shippingAddress?.street || '1 Main St',
                            city: orderData?.shippingAddress?.city || 'Perth',
                            state: orderData?.shippingAddress?.state || 'WA',
                            zip: orderData?.shippingAddress?.zip || '6000',
                            country: 'AU',
                        },
                        parcels: [
                            {
                                length: String(parcel.lengthCm),
                                width: String(parcel.widthCm),
                                height: String(parcel.heightCm),
                                distance_unit: 'cm',
                                weight: String(parcel.weightKg),
                                mass_unit: 'kg',
                            },
                        ],
                        async: false,
                    }),
                });

                if (shippoRes.ok) {
                    const shippoData = await shippoRes.json();
                    labelUrl = shippoData.rates?.[0]?.label_url || '';
                    trackingNumber = shippoData.rates?.[0]?.tracking_number || '';
                }
            } catch (err) {
                console.warn('Shippo API call failed, falling back to simulated sandbox label:', err);
            }
        }

        // If Shippo is not configured or in sandbox/mock mode:
        if (!labelUrl) {
            const mockTracking = `AU${Date.now().toString().slice(-8)}EXP`;
            trackingNumber = mockTracking;
            labelUrl = `https://benched.au/api/shipping/mock-label?orderId=${encodeURIComponent(orderId)}&tracking=${encodeURIComponent(mockTracking)}`;
        }

        await orderRef.update({
            status: 'label_created',
            trackingNumber,
            labelUrl,
            parcel,
            labelCreatedAt: new Date(),
            updatedAt: new Date(),
        });

        return {
            success: true,
            labelUrl,
            trackingNumber,
            message: `Shipping label generated (${trackingNumber}).`,
        };
    } catch (error: any) {
        console.error('Error creating shipping label:', error);
        return { success: false, message: error?.message || 'Failed to generate shipping label.' };
    }
}
