// Super Admin Configuration
export const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '').split(',').filter(Boolean);
export const SUPER_ADMIN_UIDS = (process.env.SUPER_ADMIN_UIDS || '').split(',').filter(Boolean);
