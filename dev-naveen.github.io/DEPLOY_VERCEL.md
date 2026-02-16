Vercel Deployment Checklist

1. Create a Vercel project and connect your GitHub repository.
2. In Vercel Project > Settings > Environment Variables, add:
   - `DATABASE_URL` (Postgres/Neon connection string)
   - `NEXTAUTH_SECRET` (secure random string)
   - `NODE_ENV=production`
   - Any other keys used by your app (e.g., `EMAILJS_USER_ID`).
3. Ensure `package.json` has `build` script (`next build`) — this repo already does.
4. Push to `main` (or your production branch) to trigger a deployment.
5. Verify site and API routes after deployment.

Notes:
- Do not commit secrets to the repo.
- If you use static `next export`, API routes will not work; prefer Vercel for dynamic API routes.
