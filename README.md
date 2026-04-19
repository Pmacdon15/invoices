This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Clerk Subscription Setup

This project uses Clerk for both authentication and B2B SaaS organization management (subscriptions/billing).

To properly set up billing features and limits, you need to configure your subscription plans inside Clerk with the names **"basic"** and **"pro"**. 

You also need to assign specific feature slugs to these plans in your Clerk dashboard and then supply them via your `.env.local` file so the app knows what limits to enforce. 

### Limits Supported
By default, the application falls back to these Free limits:
- Up to 4 customers
- Up to 5 products
- Up to 5 invoices/month

**Basic Plan** upgrades this to:
- Up to 8 customers
- Up to 10 products
- Up to 10 invoices/month

**Pro Plan** upgrades this to:
- Up to 100 customers
- Up to 100 products
- Up to 100 invoices/month

### Environment Configuration

Define your feature slugs inside your `.env.local` file. We have provided a `.env.example` file which contains the standard slug names. 

If you already have existing subscriptions with different feature slugs (like `create_unlimited_customers`), simply update your `.env.local` variables to match those exact strings, and the application will honor them, treating them as the 100-limit (Pro) tier.
