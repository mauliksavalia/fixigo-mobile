# FixiGo Supabase Setup

Use Supabase for the production database because FixiGo is relational:
customers, requests, providers, assignments, messages, media, and payments all connect.

## 1. Create Supabase project

1. Go to Supabase Dashboard.
2. Create a new project.
3. Save:
   - Project URL
   - Publishable anon key

Put these in the mobile app `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_or_anon_key
EXPO_PUBLIC_AUTH_REDIRECT_URL=fixigo://auth/callback
```

## 2. Create database tables

1. Open Supabase Dashboard.
2. Go to SQL Editor.
3. Paste and run `database/supabase/schema.sql`.

## 3. Enable Google login

1. In Supabase, go to Authentication > Providers.
2. Enable Google.
3. Copy the Supabase callback URL shown there.
4. In Google Cloud Console, create an OAuth Client ID.
5. Add the Supabase callback URL as an authorized redirect URI.
6. Paste Google Client ID and Client Secret into Supabase Google provider settings.

## 4. Add redirect URL

In Supabase Authentication > URL Configuration, add:

```text
fixigo://auth/callback
```

Keep your local/test URLs there while developing.

## 5. Media storage

Create a Supabase Storage bucket:

```text
service-media
```

The schema already stores bucket/path metadata in `service_media`.
