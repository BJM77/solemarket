import { PageHeader } from "@/components/layout/PageHeader";

export default function TermsPage() {
  return (
    <div className="container py-12 md:py-16">
      <PageHeader
        title="Terms of Service"
        description="Last Updated: February 2026"
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
          We use third-party payment processors (Stripe/PayPal) to handle secure transactions.
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

        <h2>6. Prohibited Items</h2>
        <p>
          You may not buy or sell counterfeit items, stolen goods, or any items listed in our Prohibited Items Policy.
        </p>

        <h2>7. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at legal@benched.au.
        </p>
      </div>
    </div>
  );
}
