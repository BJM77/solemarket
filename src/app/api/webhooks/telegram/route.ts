import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramNotification } from '@/lib/telegram';
import { getProducts } from '@/services/product-service'; // Mocked or Real
import { formatPrice } from '@/lib/utils';

import { firestoreDb } from '@/lib/firebase/admin';

// Secret token verification for production
const TELEGRAM_SECRET_TOKEN = process.env.TELEGRAM_SECRET_TOKEN;

export async function POST(req: NextRequest) {
    try {
        // Enforce secret token verification
        if (TELEGRAM_SECRET_TOKEN) {
            const secretToken = req.headers.get('x-telegram-bot-api-secret-token');
            if (secretToken !== TELEGRAM_SECRET_TOKEN) {
                console.warn('Unauthorized Telegram Webhook attempt.');
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const body = await req.json();

        // 1. Handle "Callback Queries" (Button Clicks)
        if (body.callback_query) {
            const { id, data, message } = body.callback_query;
            const chatId = message.chat.id;

            let replyText = '';

            if (data.startsWith('approve_')) {
                const productId = data.replace('approve_', '');
                await firestoreDb.collection('products').doc(productId).update({ status: 'available' });
                replyText = `✅ Listing ${productId} has been approved!`;
            } else if (data.startsWith('decline_')) {
                const productId = data.replace('decline_', '');
                await firestoreDb.collection('products').doc(productId).update({ status: 'rejected' });
                replyText = `❌ Listing ${productId} declined.`;
            } else if (data.startsWith('accept_bid_')) {
                // Bid acceptance logic (more complex, mock for now)
                replyText = `🤝 Offer accepted for ${data.replace('accept_bid_', '')}! Buyer notified.`;
            }

            // Acknowledge the callback (stops the loading spinner on the button)
            // And send a follow-up message
            await sendTelegramNotification(replyText); // This mocks the reply for now

            // In a real app, you'd use answerCallbackQuery method
            return NextResponse.json({ status: 'ok' });
        }

        // 2. Handle Text Messages (Commands)
        if (body.message && body.message.text) {
            const { text, chat } = body.message;
            const command = text.split(' ')[0].toLowerCase();
            const args = text.split(' ').slice(1).join(' ');

            if (command === '/start') {
                await sendTelegramNotification(
                    `<b>👋 Welcome Boss!</b>\n\n` +
                    `I am your <b>Benched Command Center</b>.\n\n` +
                    `<b>Try these commands:</b>\n` +
                    `/stats - View daily performance\n` +
                    `/find <name> - Search inventory\n` +
                    `/pending - Review new listings`
                );
            }

            else if (command === '/stats') {
                // Mock Stats - In real app, fetch from Orders collection
                const revenue = 1450;
                const orders = 8;
                const users = 15;

                await sendTelegramNotification(
                    `<b>📅 Daily Report (Today)</b>\n\n` +
                    `💰 <b>Revenue:</b> $${revenue.toLocaleString()} (+12%)\n` +
                    `📦 <b>Orders:</b> ${orders}\n` +
                    `👥 <b>New Users:</b> ${users}\n` +
                    `📉 <b>Price Drops:</b> 3`
                );
            }

            else if (command === '/find') {
                if (!args) {
                    await sendTelegramNotification("❌ Please provide a search term. Example: <code>/find travis</code>");
                } else {
                    // Search Logic
                    const { products } = await getProducts({ q: args, limit: 5 });

                    if (products.length === 0) {
                        await sendTelegramNotification(`🔍 No results found for "<b>${args}</b>".`);
                    } else {
                        let response = `🔍 <b>Found ${products.length} results for "${args}":</b>\n\n`;
                        products.forEach((p, i) => {
                            response += `${i + 1}. <b>${p.title}</b>\n`;
                            response += `   💰 $${p.price} | 📏 ${p.size || 'N/A'}\n`;
                            response += `   <a href="https://benched.au/product/${p.id}">View Item</a>\n\n`;
                        });
                        await sendTelegramNotification(response);
                    }
                }
            }

            else if (command === '/pending') {
                // Mock Pending Approval with Buttons
                await sendTelegramNotification(
                    "🛡️ <b>New Listing Pending Approval</b>\n\n" +
                    "<b>Item:</b> Jordan 1 Lost & Found\n" +
                    "<b>Price:</b> $600\n" +
                    "<b>Seller:</b> @sneakerhead_au",
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: "✅ Approve", callback_data: "approve_123" },
                                    { text: "❌ Decline", callback_data: "decline_123" }
                                ],
                                [
                                    { text: "👤 View Seller", url: "https://benched.au/seller/123" }
                                ]
                            ]
                        }
                    }
                );
            }

            return NextResponse.json({ status: 'ok' });
        }

        return NextResponse.json({ status: 'ignored' });
    } catch (error) {
        console.error('Telegram Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
