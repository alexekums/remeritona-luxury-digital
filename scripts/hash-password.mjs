import { createHash } from 'crypto';
const hash = createHash('sha256').update('2468').digest('hex');
console.log('Hash:', hash);
console.log('\nRun this command to update D1:');
console.log(`bunx wrangler d1 execute remeritona_bookings --remote --command "UPDATE staff_users SET password_hash = '${hash}' WHERE username = 'Devi'"`);
