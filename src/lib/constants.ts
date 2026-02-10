// Super Admin Configuration
export const SUPER_ADMIN_EMAILS = [
    'benjamin.mousley@gmail.com', // Developer
    '1@1.com', // Super Admin
    '1 @1.com', // Super Admin Variant
    ...(process.env.SUPER_ADMIN_EMAILS || '').split(',').filter(Boolean)
];
export const SUPER_ADMIN_UIDS = (process.env.SUPER_ADMIN_UIDS || '').split(',').filter(Boolean);
