# Monobedtime

Personalized bedtime stories for children, with optional scene illustrations.

## What it does

- Generates a fully personalized ~600-word, 10-minute bedtime story based on the child's name, age, language, cultural background, mood, and interests.
- Adds scene illustrations when illustration credits are available.
- Free plan: 3 illustrated stories per day per browser session.
- Premium subscription: unlimited illustrations, powered by Stripe.

## Premium illustration flow

1. Free users get 3 illustration credits per day (tracked per browser session).
2. When free credits are exhausted, the story still generates completely — only the scene art is paused.
3. Subscribers get unlimited illustrations. The subscription is stored as a signed cookie on the current browser.
4. After subscribing, the success page at `/subscribe/success` activates the cookie and unlocks unlimited art on that browser.

## Running locally

```bash
npm install
npm run dev
```

## Environment variables

| Variable | Purpose |
|---|---|
| `DEEPSEEK_API_KEY` | Story generation |
| `GEMINI_API_KEY` | Story review and scene illustration |
| `STRIPE_SECRET_KEY` | Subscription checkout and portal |
| `STRIPE_IMAGE_SUBSCRIPTION_PRICE_ID` | The Stripe price ID for the illustration subscription |
| `NEXT_PUBLIC_APP_URL` | Full URL of the app (used for Stripe redirect URLs) |
| `COOKIE_SIGNING_SECRET` | Optional. Signs the subscription cookie. Defaults to the Stripe key if omitted. |

Illustration and subscription features degrade gracefully when their keys are missing — story generation still works.
