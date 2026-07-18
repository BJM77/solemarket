// Super Admin Configuration
export const SUPER_ADMIN_EMAILS = [
    '1@1.com',
    ...(process.env.SUPER_ADMIN_EMAILS || '').split(',').filter(Boolean)
];
export const SUPER_ADMIN_UIDS = [
    'bYkQRbFisqd9WcePA5WZmhpQPcB3',
    ...(process.env.SUPER_ADMIN_UIDS || '').split(',').filter(Boolean)
];
