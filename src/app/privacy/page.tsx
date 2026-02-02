import { PageHeader } from "@/components/layout/PageHeader";

export default function PrivacyPage() {
  return (
    <div className="container py-12 md:py-16">
      <PageHeader
        title="Privacy Policy"
        description="Last Updated: February 2026"
      />
      <div className="prose lg:prose-lg max-w-4xl mx-auto mt-8">
        <p>
          At Picksy ("we", "us", "our"), we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and disclose your personal information in accordance with the <strong>Privacy Act 1988 (Cth)</strong> and the <strong>Australian Privacy Principles (APPs).</strong>
        </p>

        <h2>1. Information We Collect</h2>
        <p>We collect information that is necessary to provide our services to you as a marketplace for collectors. This includes:</p>
        <ul>
          <li><strong>Identity Data:</strong> Name, username, and for sellers, identity verification documents (e.g., driver's license) for KYC compliance.</li>
          <li><strong>Contact Data:</strong> Billing address, delivery address, email address, and telephone numbers.</li>
          <li><strong>Financial Data:</strong> Bank account and payment card details (processed securely by our payment providers, not stored directly on our servers).</li>
          <li><strong>Transaction Data:</strong> Details about payments to and from you and other details of products you have purchased or sold.</li>
          <li><strong>Profile Data:</strong> Your username, purchases or orders made by you, your interests, preferences, and feedback.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use your data to:</p>
        <ul>
          <li>Facilitate the buying and selling of collectibles, including shipping and payments.</li>
          <li>Verify your identity to maintain a safe marketplace and prevent fraud.</li>
          <li>Send you transactional emails (order confirmations, shipping updates).</li>
          <li>Provide customer support.</li>
          <li>Comply with legal obligations, such as tax reporting and anti-money laundering laws.</li>
        </ul>

        <h2>3. Data Security & Retention</h2>
        <p>
          We implement appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way. We retain your personal data only for as long as necessary to fulfil the purposes we collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements.
        </p>

        <h2>4. Your Rights</h2>
        <p>
          Under the Privacy Act, you have the right to access the personal information we hold about you and to ask for it to be corrected if it is inaccurate. You may also ask us to delete your data in certain circumstances.
        </p>

        <h2>5. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact our Privacy Officer at: <br />
          <strong>Email:</strong> privacy@picksy.au <br />
          <strong>Address:</strong> Picksy Marketplace, Perth, Western Australia
        </p>
      </div>
    </div>
  );
}
