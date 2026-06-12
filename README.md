# Geiger Content

The content product shell for the Geiger Studio suite.

## Development

```bash
npm install
npm run dev
```

Local routes:

- `/` and `/home` - empty Content workspace shell
- `/pallet` - dark palette reference
- `/palletw` - light palette reference

Production builds use the `/content` base path.

## Deployment

The Vercel project is served at `https://geigercontent.vercel.app/content`
and is proxied by `geiger-dash` without stripping the `/content` prefix.

Configure these variables in the Vercel Production environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
