// Run with: npx ts-node scripts/test-telegram.ts
import { sendTelegramNotification } from '../src/lib/telegram';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    console.log('Testing Telegram notification...');
    const success = await sendTelegramNotification('<b>Test Notification from Benched.au</b>

Webhook setup is complete and ready for production!');
    if (success) {
        console.log('✅ Success! Check your phone.');
    } else {
        console.log('❌ Failed. Check logs and ensure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are in .env.local');
    }
}

main().catch(console.error);
