export async function sendTelegramNotification(message: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.warn('Telegram notification skipped: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
        return false;
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            }),
        });

        if (!response.ok) {
            const data = await response.json();
            console.error('Telegram notification failed:', data);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error sending Telegram notification:', error);
        return false;
    }
}
