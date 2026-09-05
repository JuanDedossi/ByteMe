// Pin server timezone BEFORE any other code runs. Vercel runs serverless
// functions in UTC; without this, local-time date logic (new Date(y,m,d),
// setHours, etc.) would compute boundaries in UTC, shifting the day/week/
// month for users not on UTC. We always force Argentina TZ — this app has
// no use case for any other timezone, and overriding here prevents a stray
// TZ env var (set explicitly or implicitly by Vercel) from leaking through.
process.env.TZ = 'America/Argentina/Buenos_Aires';

import app from '../server/src/app';

export default app;
