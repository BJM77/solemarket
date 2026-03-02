// src/lib/analytics.ts

export const sendGAEvent = (eventName: string, params: any = {}) => {
    if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
        (window as any).gtag('event', eventName, params);
    }
};

export const trackEcommerceEvent = {
    viewItem: (product: any) => {
        if (!product) return;
        sendGAEvent('view_item', {
            currency: 'AUD',
            value: product.price || 0,
            items: [
                {
                    item_id: product.id,
                    item_name: product.title,
                    item_category: product.category || '',
                    price: product.price || 0,
                    quantity: 1
                }
            ]
        });
    },
    addToCart: (product: any, quantity: number = 1) => {
        if (!product) return;
        sendGAEvent('add_to_cart', {
            currency: 'AUD',
            value: (product.price || 0) * quantity,
            items: [
                {
                    item_id: product.id,
                    item_name: product.title,
                    item_category: product.category || '',
                    price: product.price || 0,
                    quantity: quantity
                }
            ]
        });
    },
    beginCheckout: (items: any[], totalValue: number) => {
        if (!items || items.length === 0) return;
        sendGAEvent('begin_checkout', {
            currency: 'AUD',
            value: totalValue,
            items: items.map(item => ({
                item_id: item.id,
                item_name: item.title,
                item_category: item.category || '',
                price: item.price || 0,
                quantity: item.cartQuantity || item.quantity || 1
            }))
        });
    },
    purchase: (transactionId: string, value: number, items: any[], shipping: number = 0, tax: number = 0) => {
        if (!items || items.length === 0) return;
        sendGAEvent('purchase', {
            transaction_id: transactionId,
            currency: 'AUD',
            value: value,
            shipping: shipping,
            tax: tax,
            items: items.map(item => ({
                item_id: item.id,
                item_name: item.title,
                item_category: item.category || '',
                price: item.price || 0,
                quantity: item.cartQuantity || item.quantity || 1
            }))
        });
    }
};
