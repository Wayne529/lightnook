import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(__dirname, '../../../.env'), quiet: true });
export const root = resolve(__dirname, '../../..');
export const mediaDir = resolve(root, process.env.MEDIA_DIR || '../work/lightnook-runtime/media');
export function requireConfig() {
  if (!process.env.DATABASE_URL || !process.env.MEDIA_SIGNING_SECRET || process.env.MEDIA_SIGNING_SECRET.length < 32) throw new Error('DATABASE_URL and MEDIA_SIGNING_SECRET (32+ characters) are required.');
  if (process.env.NODE_ENV === 'production' && process.env.DEV_AUTH === 'true') throw new Error('DEV_AUTH must be disabled in production.');
}
