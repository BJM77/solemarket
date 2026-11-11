/** Which notification setup this browser supports (pure, unit tested). */

export type PushSupport =
    | 'supported'
    /** iPhone/iPad in Safari: web push only works once the site is added to the Home Screen (iOS 16.4+). */
    | 'ios-needs-home-screen'
    /** iOS older than 16.4: no web push at all. */
    | 'ios-too-old'
    | 'unsupported';

export interface BrowserBits {
    userAgent: string;
    maxTouchPoints?: number;
    standalone: boolean;
    hasNotification: boolean;
    hasServiceWorker: boolean;
    hasPushManager: boolean;
}

export function isIos(ua: string, maxTouchPoints = 0): boolean {
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    // iPadOS 13+ reports itself as a Mac.
    return /Macintosh/i.test(ua) && maxTouchPoints > 1;
}

export function iosVersion(ua: string): number | null {
    const m = ua.match(/OS (\d+)[_.](\d+)/i) || ua.match(/Version\/(\d+)\.(\d+)/i);
    return m ? Number(m[1]) + Number(m[2]) / 100 : null;
}

export function detectPushSupport(b: BrowserBits): PushSupport {
    const ios = isIos(b.userAgent, b.maxTouchPoints);
    const ready = b.hasNotification && b.hasServiceWorker && b.hasPushManager;
    if (ios) {
        const v = iosVersion(b.userAgent);
        if (v !== null && v < 16.04) return 'ios-too-old';
        if (!b.standalone) return 'ios-needs-home-screen';
        return ready ? 'supported' : 'ios-needs-home-screen';
    }
    return ready ? 'supported' : 'unsupported';
}

/** Short label stored with the token so a seller can tell their devices apart. */
export function deviceLabel(ua: string, maxTouchPoints = 0): string {
    const os = isIos(ua, maxTouchPoints) ? 'iPhone/iPad' : /Android/i.test(ua) ? 'Android' : /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : 'Device';
    const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    return `${browser} on ${os}`;
}
