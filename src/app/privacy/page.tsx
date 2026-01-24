
import { PageHeader } from "@/components/layout/PageHeader";

export default function PrivacyPage() {
  return (
    <div className="container py-12 md:py-16">
      <PageHeader
        title="Privacy Policy"
        description="Last Updated: October 26, 2023"
      />
      <div className="prose lg:prose-lg max-w-4xl mx-auto mt-8">
        <p>
          This Privacy Policy describes Our policies and procedures on the collection,
          use and disclosure of Your information when You use the Service and tells
          You about Your privacy rights and how the law protects You.
        </p>
        <p>
          We use Your Personal data to provide and improve the Service. By using the
          Service, You agree to the collection and use of information in accordance
          with this Privacy Policy.
        </p>

        <h2>Interpretation and Definitions</h2>
        <h3>Interpretation</h3>
        <p>
          The words of which the initial letter is capitalized have meanings
          defined under the following conditions. The following definitions shall
          have the same meaning regardless of whether they appear in singular or in
          plural.
        </p>

        <h2>Collecting and Using Your Personal Data</h2>
        <h3>Types of Data Collected</h3>
        <h4>Personal Data</h4>
        <p>
          While using Our Service, We may ask You to provide Us with certain
          personally identifiable information that can be used to contact or
          identify You. Personally identifiable information may include, but is not
          limited to: Email address, First name and last name, Phone number,
          Address, State, Province, ZIP/Postal code, City, Usage Data.
        </p>
        <h4>Usage Data</h4>
        <p>
          Usage Data is collected automatically when using the Service. Usage Data
          may include information such as Your Device's Internet Protocol address
          (e.g. IP address), browser type, browser version, the pages of our
          Service that You visit, the time and date of Your visit, the time spent
          on those pages, unique device identifiers and other diagnostic data.
        </p>

        <h2>Use of Your Personal Data</h2>
        <p>The Company may use Personal Data for the following purposes:</p>
        <ul>
          <li>To provide and maintain our Service, including to monitor the usage of our Service.</li>
          <li>To manage Your Account: to manage Your registration as a user of the Service.</li>
          <li>For the performance of a contract: the development, compliance and undertaking of the purchase contract for the products, items or services You have purchased or of any other contract with Us through the Service.</li>
          <li>To contact You: To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication.</li>
        </ul>

        <h2>Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, You can contact us:
          By email: legal@picksy.com
        </p>
      </div>
    </div>
  );
}
