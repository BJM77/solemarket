/**
 * Ping search engines via IndexNow API when new listings are published.
 * Supported by Bing, Yandex, Seznam, and other participating engines.
 */
export async function notifyIndexNow(urls: string[]): Promise<boolean> {
  const host = 'benched.au';
  const key = process.env.INDEXNOW_KEY;
  if (!key || !urls.length) return false;

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `https://${host}/${key}.txt`,
        urlList: urls.slice(0, 100),
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('IndexNow ping failed (non-blocking):', err);
    return false;
  }
}
