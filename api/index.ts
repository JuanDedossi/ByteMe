// Pin server timezone before importing the app so all Date/timestamp code
// runs in the same TZ regardless of platform (Vercel runs UTC by default).
if (!process.env.TZ) {
  process.env.TZ = 'America/Argentina/Buenos_Aires';
}

import app from '../server/src/app';

export default app;
