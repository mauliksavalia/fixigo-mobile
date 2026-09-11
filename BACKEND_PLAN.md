# Fixee Go Backend Plan

This app currently uses the Expo mobile app plus a local Node/Express backend.
The backend now uses a local SQLite relational database for development.

## Recommended production stack

- Auth: Firebase Auth or Supabase Auth
- Phone OTP: Twilio Verify or Firebase phone auth
- Database: Supabase Postgres for production; local SQLite for development
- File storage: Firebase Storage or Supabase Storage
- Payments: Stripe PaymentSheet
- Maps and service area: Google Maps Platform
- Notifications: Expo Notifications, then FCM/APNs for production builds

Current choice: Supabase Postgres is the recommended production database for FixiGo.
Run `database/supabase/schema.sql` in Supabase SQL Editor to create the relational tables.

## Core database entities

- customers: first name, last name, email, verified phone, saved addresses
- providers: technician profile, trade categories, service area, insurance/license fields
- service_requests: category, description, address, schedule window, status, priority
- service_media: request id, file type, storage path, file size, upload status
- job_assignments: request id, provider id, ETA, status history
- messages: job id, sender id, message text, media attachment metadata
- payments: job id, customer id, Stripe payment intent id, amount, status
- reviews: job id, customer id, provider id, rating, review text

## Current local SQLite tables

- customers
- providers
- service_categories
- service_requests
- service_media
- job_assignments
- status_history
- messages
- payments

## Current development portals

- Customer mobile app: Expo app in this project
- Admin web portal: `http://localhost:4242/admin`
- Maintenance web portal: `http://localhost:4242/maintenance`
- Uploaded media: stored locally under `backend/uploads` and served from `/uploads`
- Relational database: `backend/data/fixigo.sqlite`
- Database status: `http://localhost:4242/database/status`

This local setup is for development only. Production should move requests and uploads
to the real database and cloud storage provider.

## Recommended product split as the business grows

```text
apps/
  customer-mobile/
  admin-web/
  provider-web/
backend/
  api/
  database/
  payments/
  storage/
  notifications/
```

## Current media limits

- Photos: up to 8 per request, 8 MB each
- Videos: up to 2 per request, 80 MB each
- Allowed extensions: jpg, jpeg, png, heic, mp4, mov

## What we need before connecting real backend

- Firebase or Supabase project credentials
- Stripe account and publishable key
- Twilio account or Firebase phone auth decision
- Google Maps API key
- Business service area rules for Massachusetts towns
- Final list of maintenance categories and provider types

## Stripe setup steps

1. Open Stripe Dashboard.
2. Go to Developers > API keys.
3. Copy the publishable key that starts with `pk_test_`.
4. Copy the secret key that starts with `sk_test_`.
5. Put the publishable key in the app `.env` file.
6. Put the secret key only in `backend/.env`.
7. Do not paste secret keys into chat or commit them to Git.

App `.env` example:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_COMPUTER_IP:4242
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
EXPO_PUBLIC_STRIPE_MERCHANT_NAME=Fixee Go
EXPO_PUBLIC_STRIPE_RETURN_URL=fixeego://stripe-redirect
```

Backend `backend/.env` example:

```env
PORT=4242
APP_ORIGIN=*
STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
```

## Stripe mobile app note

The app can preview mock payment setup in Expo Go. Real Stripe PaymentSheet uses native
Stripe code, so the production-quality mobile payment flow should run in an Expo
development build or a store build after installing `@stripe/stripe-react-native`.
