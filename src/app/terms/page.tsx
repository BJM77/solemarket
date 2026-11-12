import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from "@/components/layout/PageHeader";
import { AFFILIATION_DISCLAIMER } from '@/lib/legal/disclaimer';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: "The terms that apply when you buy, sell or browse on Benched, Australia's marketplace for basketball cards and sneakers.",
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <div className="container py-12 md:py-16">
      <PageHeader
        title="Terms of Service"
        description="Last Updated: November 2026"
      />
      <div className="prose lg:prose-lg max-w-4xl mx-auto mt-8">
        <h2>1. Introduction</h2>
        <p>
          Welcome to Benched ("Company", "we", "our", "us"). These Terms of Service ("Terms") govern your use of our website and services (collectively, the "Service").
          By accessing or using the Service, you agree to be bound by these Terms.
        </p>

        <h2>2. Buying and Selling</h2>
        <p>
          <strong>Selling:</strong> By listing an item on Benched, you verify that you are the legal owner of the item and that its description (including condition and authenticity) is accurate. You agree to ship sold items within 3 business days.
        </p>
        <p>
          <strong>Buying:</strong> When you purchase an item, you agree to pay the listed price plus any applicable shipping and service fees. All sales are final unless the item received is significantly different from its description.
        </p>

        <h2>3. Fees and Payments</h2>
        <p>
          You agree to pay the fees for using the Service as described on our Fees page. All fees are in Australian Dollars (AUD).
          Buyers pay sellers directly by PayID or cash on pickup. Benched does not hold or process payments.
        </p>

        <h2>4. Shipping and Delivery</h2>
        <p>
          Sellers are responsible for packaging items securely to prevent damage. We recommend using tracked shipping services (e.g., Australia Post with tracking) for all orders.
          Benched is not liable for items lost in transit if no tracking was provided.
        </p>

        <h2>5. Refunds and Returns</h2>
        <p>
          <strong>Benched Guarantee:</strong> If an item arrives damaged or is not as described, you may request a refund within 3 days of delivery.
          We comply with the <strong>Australian Consumer Law</strong> under the Competition andConsumer Act 2010 (Cth). Our goods come with guarantees that cannot be excluded under the Australian Consumer Law.
        </p>

        <h2>6. Prohibited items</h2>
        <p>
          You must not list, buy or sell counterfeit, replica or otherwise inauthentic goods, stolen goods, or items that infringe someone else&apos;s intellectual property.
          See our <Link href="/prohibited-items">Prohibited Items Policy</Link>.
          We may remove a listing, end an account, and block the associated mobile number.
        </p>

        <h2>7. Authenticity</h2>
        <p>
          Benched is a peer-to-peer marketplace. We do not physically inspect or authenticate items before they are listed or sold.
          Sellers are responsible for the accuracy of their listings, including authenticity, and buyers pay the seller directly by PayID or cash on pickup.
          For a graded card, if the seller provides a PSA certification number, we may look that number up in PSA&apos;s records (or show a cached result) so you can compare the cert details with the listing photos.
          That check only confirms the number exists in PSA&apos;s database; it does not confirm that the card being sold is that same card, and it is not a Benched authentication.
          Inspect photos, ask questions, and for higher-value purchases consider cash on pickup in Perth so you can inspect before paying.
          If an item is fake or not as described, report it from your order or the <Link href="/contact?topic=order-problem">contact page</Link>.
        </p>

        <h2>8. Independent marketplace</h2>
        <p>{AFFILIATION_DISCLAIMER}</p>
        <p>
          Rights holders can ask us to review a listing through our <Link href="/report-infringement">infringement report form</Link>.
        </p>

        <h2>9. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at legal@benched.au.
        </p>
      </div>
    </div>
  );
}
