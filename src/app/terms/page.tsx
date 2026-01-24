
import { PageHeader } from "@/components/layout/PageHeader";

export default function TermsPage() {
  return (
    <div className="container py-12 md:py-16">
      <PageHeader
        title="Terms of Service"
        description="Last Updated: October 26, 2023"
      />
      <div className="prose lg:prose-lg max-w-4xl mx-auto mt-8">
        <h2>1. Agreement to Terms</h2>
        <p>
          By using our Service, you agree to be bound by these Terms. If you
          don’t agree to be bound by these Terms, do not use the Service.
        </p>
        
        <h2>2. Privacy Policy</h2>
        <p>
          Please refer to our Privacy Policy for information on how we collect,
          use and disclose information from our users. You acknowledge and
          agree that your use of the Service is subject to our Privacy Policy.
        </p>

        <h2>3. Content Ownership</h2>
        <p>
            We do not claim any ownership rights in any User Content and nothing in these Terms will be deemed to restrict any rights that you may have to use and exploit your User Content.
        </p>
        
        <h2>4. Prohibitions</h2>
        <p>You agree not to do any of the following:</p>
        <ul>
          <li>Post, upload, publish, submit or transmit any Content that: (i) infringes, misappropriates or violates a third party’s patent, copyright, trademark, trade secret, moral rights or other intellectual property rights, or rights of publicity or privacy; (ii) violates, or encourages any conduct that would violate, any applicable law or regulation or would give rise to civil liability;</li>
          <li>Use, display, mirror or frame the Service or any individual element within the Service, Picksy’s name, any Picksy trademark, logo or other proprietary information, or the layout and design of any page or form contained on a page, without Picksy’s express written consent;</li>
        </ul>
        
        <h2>5. Termination</h2>
        <p>
            We may terminate your access to and use of the Service, at our sole discretion, at any time and without notice to you.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at legal@picksy.com.
        </p>
      </div>
    </div>
  );
}
