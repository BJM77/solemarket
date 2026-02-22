// Super Admin Configuration
export const SUPER_ADMIN_EMAILS = [
    'benjamin.mousley@gmail.com', // Developer
    '1@1.com', // Super Admin
    '1 @1.com', // Super Admin Variant
    ...(process.env.SUPER_ADMIN_EMAILS || '').split(',').filter(Boolean)
];
export const SUPER_ADMIN_UIDS = [
    'Bz5bN7j3fpgbKBP75L1Uv5Cihl13', // testagent@benched.test
    '6bOgyg1KNqMLTYtv3hiO4yN7bVl1', // 1@1.com
    ...(process.env.SUPER_ADMIN_UIDS || '').split(',').filter(Boolean)
];
