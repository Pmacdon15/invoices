import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <div className="space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing and using this application, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">2. Data Usage</h2>
          <p>
            We use your data solely for operational purposes to provide and improve the invoicing services. We do not sell your personal or business data to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">3. Updates to Terms</h2>
          <p>
            These terms can be updated at any time without prior warning. Continued use of the application constitutes acceptance of the revised terms. You are encouraged to check this page periodically.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">4. License and Attribution</h2>
          <p>
            This software is provided "as is". Use for personal and non-commercial purposes is free. For commercial use, users must rebrand the application and provide clear attribution to the original author, <strong>Patrick MacDonald</strong>, including a link to the GitHub profile: <Link href="https://github.com/pmacdon15" className="text-primary hover:underline">https://github.com/pmacdon15</Link>.
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
