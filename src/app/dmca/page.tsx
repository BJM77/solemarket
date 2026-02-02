
import { PageHeader } from "@/components/layout/PageHeader";

export default function DMCAPage() {
  return (
    <div className="container py-12 md:py-16">
      <PageHeader
        title="DMCA Takedown Policy"
        description="Our policy for handling copyright infringement claims."
      />
      <div className="prose lg:prose-lg max-w-4xl mx-auto mt-8">
        <h2>1. Introduction</h2>
        <p>
          Picksy Marketplace respects the intellectual property rights of others
          and expects its users to do the same. In accordance with the Digital
          Millennium Copyright Act (DMCA), we will respond expeditiously to
          claims of copyright infringement committed using the Picksy service
          that are reported to our Designated Copyright Agent.
        </p>

        <h2>2. Reporting Claims of Copyright Infringement</h2>
        <p>
          If you are a copyright owner, or are authorized to act on behalf of
          one, please report alleged copyright infringements taking place on or
          through the Site by completing the following DMCA Notice of Alleged
          Infringement and delivering it to our Designated Copyright Agent.
        </p>
        <p>
          Your notice must include:
        </p>
        <ul>
          <li>A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
          <li>Identification of the copyrighted work claimed to have been infringed.</li>
          <li>Identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed or access to which is to be disabled.</li>
          <li>Information reasonably sufficient to permit us to contact you, such as an address, telephone number, and, if available, an email address.</li>
          <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
          <li>A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
        </ul>
        <p>
          Deliver this notice, with all items completed, to Picksy's Designated Copyright Agent at legal@picksy.au.
        </p>

        <h2>3. Counter-Notification Procedures</h2>
        <p>
          If you believe that your material has been removed or disabled by mistake or misidentification, you may file a counter-notification with us by submitting a written notification to our copyright agent.
        </p>
      </div>
    </div>
  );
}
