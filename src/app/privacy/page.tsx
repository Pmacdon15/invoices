export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">1. Information We Collect</h2>
          <p>
            We collect information necessary to provide invoicing services, including customer contact details and product information you provide.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">2. How We Use Your Data</h2>
          <p>
            Your data is used strictly for operational purposes: generating invoices, managing your customers and products, and sending emails via our service providers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">3. Data Sharing</h2>
          <p>
            We share data only with trusted third-party service providers required for the application's operation:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Clerk</strong> (Authentication and User Management)</li>
            <li><strong>Neon</strong> (Database Storage)</li>
            <li><strong>AWS</strong> (Email dispatch via SES)</li>
          </ul>
          <p className="mt-2">
            We do not sell your data to any third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">4. Data Security</h2>
          <p>
            We implement industry-standard security measures provided by our hosting and infrastructure partners to protect your data.
          </p>
        </section>

        <section>
          <p className="text-sm italic">
            Last updated: April 18, 2026
          </p>
        </section>
      </div>
    </div>
  );
}
