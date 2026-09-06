import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-text p-8">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-text-muted hover:text-primary mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="bg-surface border border-surface-highlight rounded-xl p-8 md:p-12 shadow-sm prose prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-8">Terms of Service Addendum</h1>
          
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-bold mb-4">Definitions</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>“Designer Marketplace”</strong> (also referred to as “Designer Marker Place”) means any feature of the Services that enables Users to discover, communicate with, contract with, or pay third-party designers.
                </li>
                <li>
                  <strong>“Designer”</strong> means any third party that offers design, creative, content, branding, layout, menu board design, media creation, templates, or other creative services through the Designer Marketplace, and who is <strong>not</strong> an employee, agent, partner, or subcontractor of Company unless expressly stated in a signed writing by Company.
                </li>
                <li>
                  <strong>“Designer Services”</strong> means services provided by a Designer to a User.
                </li>
                <li>
                  <strong>“Project”</strong> means any engagement, job, order, or request between a User and a Designer.
                </li>
                <li>
                  <strong>“Deliverables”</strong> means all work product, files, creative output, designs, layouts, documents, media, or other materials produced in connection with a Project.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">Section: Designer Marketplace and Third-Party Designers</h2>
              
              <h3 className="text-lg font-bold mt-6 mb-2">2.1 Platform Only; No Employment or Agency</h3>
              <p>
                Company provides the Designer Marketplace solely as a neutral platform to facilitate connections between Users and Designers. <strong>Designers are independent third parties</strong> and are not employees, agents, joint venturers, partners, subcontractors, or representatives of Company. Company does not control Designers, does not direct their work, and is not responsible for any Designer’s acts, omissions, communications, or performance.
              </p>

              <h3 className="text-lg font-bold mt-6 mb-2">2.2 Your Relationship is Directly With the Designer</h3>
              <p>Any Project is <strong>a direct agreement between you and the Designer</strong>. You are solely responsible for:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>confirming scope, timing, pricing, revisions, and acceptance criteria;</li>
                <li>confirming rights/permissions (including fonts, stock media, trademarks, likeness rights);</li>
                <li>confirming compliance (advertising claims, pricing accuracy, required disclosures, allergen/nutrition statements, etc.); and</li>
                <li>determining whether a Designer is suitable for your needs.</li>
              </ul>
              <p className="mt-2">
                Company is not a party to any agreement between you and a Designer and <strong>disclaims all responsibility</strong> for such agreements.
              </p>

              <h3 className="text-lg font-bold mt-6 mb-2">2.3 No Endorsement; No Screening Guarantee</h3>
              <p>
                Company may display Designer profiles, portfolios, ratings, or other information, but <strong>does not endorse, guarantee, or warrant</strong> any Designer or Designer Services. Any checks, verifications, badges, or “recommended” designations (if offered) are informational only and do not create any warranty or obligation by Company.
              </p>

              <h3 className="text-lg font-bold mt-6 mb-2">2.4 Payments, Fees, and Refunds (If Enabled)</h3>
              <p>
                If the platform enables payments to Designers, you authorize Company and/or its payment processor to process payments and applicable platform fees. <strong>All payment disputes related to the Designer’s work—including quality, scope, timing, revisions, or non-performance—must be handled directly with the Designer</strong>, not Company.
              </p>
              <p className="mt-2">To the maximum extent permitted by law, Company:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>does not guarantee refunds for Designer Services;</li>
                <li>is not responsible for chargebacks or reversals initiated by you or the Designer; and</li>
                <li>may (but is not obligated to) provide limited administrative support for payment processing issues.</li>
              </ul>

              <h3 className="text-lg font-bold mt-6 mb-2">2.5 Deliverables, IP, and Licensing Are Between You and the Designer</h3>
              <p>
                Unless expressly stated otherwise in a separate written agreement between you and the Designer, Deliverables and intellectual property rights are determined solely between you and the Designer. Company does not guarantee that Deliverables are non-infringing or fit for a particular purpose.
                You are responsible for ensuring your use of Deliverables complies with applicable law and third-party rights.
              </p>

              <h3 className="text-lg font-bold mt-6 mb-2">2.6 Disputes With Designers Must Be Resolved With the Designer</h3>
              <p>
                You agree that <strong>any dispute, claim, or controversy arising from or relating to a Designer, Designer Services, a Project, or Deliverables is strictly between you and the Designer</strong>. You agree:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>to pursue resolution directly with the Designer first; and</li>
                <li><strong>not to name, include, or join Company</strong> in any such dispute to the maximum extent permitted by law.</li>
              </ul>
              <p className="mt-2">
                Company may, at its sole discretion, attempt to facilitate communication between you and a Designer, but has <strong>no obligation</strong> to do so and does not act as an arbitrator, mediator, or decision-maker.
              </p>

              <h3 className="text-lg font-bold mt-6 mb-2">2.7 Release</h3>
              <p>
                To the maximum extent permitted by law, you release Company from any and all claims, demands, damages, liabilities, losses, costs, and expenses arising out of or related to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>your interactions with any Designer,</li>
                <li>any Project or Deliverables,</li>
                <li>any Designer’s acts or omissions,</li>
                <li>any alleged infringement or misuse of intellectual property in Deliverables,</li>
                <li>any content displayed or published based on Designer Deliverables.</li>
              </ul>

              <h3 className="text-lg font-bold mt-6 mb-2">2.8 Indemnity for Designer-Related Claims</h3>
              <p>
                Without limiting your indemnification obligations elsewhere in these Terms, you agree to defend, indemnify, and hold harmless Company from any claims or disputes arising out of or related to any Designer, Designer Services, Project, or Deliverables, including claims by a Designer against you or by third parties arising from Deliverables you use or display.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">Update: Dispute Resolution / Arbitration</h2>
              
              <h3 className="text-lg font-bold mt-6 mb-2">Designer Disputes Excluded From Company Dispute Process</h3>
              <p>
                For clarity: <strong>Company’s informal resolution and arbitration provisions apply only to disputes between you and Company.</strong> Disputes between you and any Designer (including Designer Services, Projects, payments for Designer work, quality, scope, timing, revisions, or Deliverables) must be handled directly with the Designer under Section “Designer Marketplace and Third-Party Designers,” and Company is not a proper party to such disputes.
              </p>
              <p className="mt-2">
                <strong>If you nonetheless assert a claim against Company arising out of a Designer dispute</strong>, that claim remains subject to the mandatory arbitration, limitation of liability, and other protections in these Terms.
              </p>

              <h3 className="text-lg font-bold mt-6 mb-2">Update: Limitation of Liability</h3>
              <p>Add: "Company’s limitations and disclaimers apply fully to Designer-related claims."</p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">Mandatory Designer–User Arbitration (JAMS; Keep Company Out)</h2>
              
              <h3 className="text-lg font-bold mt-6 mb-2">10.1 Mandatory Arbitration for Designer–User Disputes</h3>
              <p>
                You agree that all disputes, claims, or controversies between you and any User arising out of or relating to Designer Services, Projects, Deliverables, revisions, payments, refunds, chargebacks, communications, alleged infringement, or any other interaction between you and the User (each, a “Designer–User Dispute”) will be resolved by binding arbitration administered by JAMS, and not in court, except:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>either party may bring an individual claim in small claims court if eligible under applicable law and rules, and</li>
                <li>either party may seek temporary injunctive relief in a court of competent jurisdiction solely to prevent imminent harm related to misuse of intellectual property or confidential information (with the merits still resolved by arbitration unless prohibited by law).</li>
              </ul>

              <h3 className="text-lg font-bold mt-6 mb-2">10.2 Administrator and Rules</h3>
              <p>
                Arbitration will be administered by JAMS under the JAMS rules then in effect that are applicable to the dispute type (including any consumer or expedited rules, if applicable).
              </p>

              <h3 className="text-lg font-bold mt-6 mb-2">10.3 Seat / Location (Virginia Default; User’s State When Required)</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Default Seat:</strong> Unless required otherwise by applicable law, the seat of arbitration will be Commonwealth of Virginia, and hearings may occur in Fairfax County, Virginia (or another Virginia location selected by JAMS consistent with its rules).</li>
                <li><strong>User’s State When Required:</strong> If applicable law requires that arbitration occur in the User’s state of residence (or otherwise prohibits requiring Virginia as the seat), then the seat will be the User’s state of residence, in a location determined by JAMS consistent with its rules.</li>
                <li><strong>Remote Option:</strong> The arbitrator may permit the arbitration to be conducted by video, telephone, or based on written submissions, to the maximum extent permitted by JAMS rules and applicable law.</li>
              </ul>

              <h3 className="text-lg font-bold mt-6 mb-2">10.4 Governing Law for Arbitration Enforcement</h3>
              <p>
                The Federal Arbitration Act (FAA) governs the interpretation and enforcement of this arbitration provision to the maximum extent permitted. For substantive claims, the arbitrator will apply the applicable governing law as determined by Section 15 (Governing Law) below, except where prohibited by law.
              </p>

              <h3 className="text-lg font-bold mt-6 mb-2">10.5 Class, Collective, and Representative Action Waiver</h3>
              <p>
                You and the User agree that any Designer–User Dispute must be brought only in an individual capacity, and not as a plaintiff or class member in any purported class, collective, private attorney general, or representative proceeding, to the maximum extent permitted by law.
              </p>

              <h3 className="text-lg font-bold mt-6 mb-2">10.6 Company Not a Party; No Joinder</h3>
              <p>
                You and the User agree that Company is not a party to any Designer–User Dispute and must not be named, joined, or impleaded in any such dispute.
              </p>

              <h3 className="text-lg font-bold mt-6 mb-2">10.7 No Compelled Participation by Company (Maximum Extent Permitted)</h3>
              <p>
                To the maximum extent permitted by law, you agree you will not seek to require Company to participate in Designer–User Disputes, including through subpoenas for testimony or production. If a subpoena or legal process is served on Company, you agree to reimburse Company for reasonable costs and attorneys’ fees incurred in responding, unless prohibited by law.
              </p>

              <h3 className="text-lg font-bold mt-6 mb-2">10.8 Pre-Arbitration Informal Resolution (Direct to Each Other)</h3>
              <p>
                Before initiating arbitration, you and the User agree to attempt good-faith informal resolution for at least 30 days by sending a written notice of dispute to the other party (email is acceptable if provided in profile or project terms), describing the issue and the relief requested.
              </p>

              <h3 className="text-lg font-bold mt-6 mb-2">Update to Section 15 “Governing Law”</h3>
              <p>
                “If applicable law requires a different governing law for a Designer–User Dispute (including consumer protection requirements), the arbitrator will apply that law to the extent required.”
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
