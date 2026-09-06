import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const PrivacyPolicy = () => {
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
          <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="space-y-8">
            <div className="text-sm text-text-muted mb-8">
              <p><strong>Effective Date:</strong> January 22, 2026</p>
              <p><strong>Last Updated:</strong> January 22, 2026</p>
            </div>

            <p>
              This Privacy Policy explains how <strong>Accel Analysis, LLC</strong> and its brands and affiliated entities, including <strong>AccelRestaurants</strong> (collectively, “<strong>Company</strong>,” “<strong>we</strong>,” “<strong>us</strong>,” “<strong>our</strong>”), collect, use, disclose, and protect information when you access or use our websites, applications, software, and related services (collectively, the “<strong>Services</strong>”).
            </p>
            <p>
              By using the Services, you agree to the practices described in this Privacy Policy. If you do not agree, do not use the Services.
            </p>

            <section>
              <h2 className="text-xl font-bold mb-4">1) Scope</h2>
              <p>This Privacy Policy applies to information we collect:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>through the Services (including account creation, platform usage, and support),</li>
                <li>through communications with us (email, chat, phone, forms),</li>
                <li>from integrations and third-party providers you connect to the Services, and</li>
                <li>from your devices and browsers (e.g., cookies and analytics).</li>
              </ul>
              <p className="mt-2">
                This Privacy Policy does <strong>not</strong> apply to third-party websites, apps, or services that we do not control, even if they are linked from our Services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">2) Key Definitions</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>“Personal Information”</strong> means information that identifies, relates to, describes, or could reasonably be linked to an individual (as defined by applicable law).</li>
                <li><strong>“Customer Data”</strong> means data submitted to the Services by or on behalf of a business customer (including business content, menu content, images/videos, layouts, screen configurations, and any personal data contained within such content).</li>
                <li><strong>“Partner Designer” / “Designer”</strong> means a third-party design provider accessible through a Partner Designer feature or marketplace. Designers are <strong>not employees</strong> of Company. They may be independent contractors or third parties and may have their own privacy practices.</li>
                <li><strong>“Design Transaction”</strong> means a user-requested design project facilitated through the Services, including scope, communication, and delivery of design outputs.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">3) Information We Collect</h2>
              
              <h3 className="text-lg font-bold mt-6 mb-2">A) Information you provide to us</h3>
              <p>Depending on how you use the Services, you may provide:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Account Information:</strong> name, email, phone number, password/credentials (stored in encrypted/hashed form where applicable), account role.</li>
                <li><strong>Business Information:</strong> business name, location(s), address, business contact details, branding details, operating hours, and related profile information.</li>
                <li><strong>Content and Files:</strong> menus, prices, promotions, product descriptions, images, videos, brand assets, templates, layouts, screen configurations, and other content you upload or create.</li>
                <li><strong>Communications:</strong> messages, emails, support requests, feedback, and other communications.</li>
                <li><strong>Transaction Information:</strong> subscription plan selection, billing contact details, and transaction metadata (note: payment card details are typically processed by third-party payment processors, not stored by Company, unless expressly stated).</li>
              </ul>

              <h3 className="text-lg font-bold mt-6 mb-2">B) Information collected automatically</h3>
              <p>When you use the Services, we may automatically collect:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Device and Usage Data:</strong> IP address, browser type, device identifiers, operating system, app version, timestamps, pages/screens viewed, actions taken, and referral URLs.</li>
                <li><strong>Log Data:</strong> diagnostic, crash, and performance logs.</li>
                <li><strong>Approximate Location:</strong> derived from IP address (e.g., city/state), primarily for security, analytics, and localization.</li>
              </ul>

              <h3 className="text-lg font-bold mt-6 mb-2">C) Information from third parties</h3>
              <p>We may receive information from:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Payment processors</strong> (e.g., confirmation of payment status, billing events),</li>
                <li><strong>Authentication providers</strong> (e.g., single sign-on),</li>
                <li><strong>Integrations you enable</strong> (e.g., content sources, analytics, media platforms),</li>
                <li><strong>Service providers</strong> that support our operations (hosting, security, analytics, customer support tools, communications tools, security monitoring).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">4) How We Use Information</h2>
              <p>We may use the information we collect to:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li><strong>Provide and operate the Services</strong> (account creation, authentication, content management, screen deployment, syncing, hosting, and delivery).</li>
                <li><strong>Process subscriptions and transactions</strong> and manage billing, renewals, and account administration.</li>
                <li><strong>Enable collaboration features</strong> (multi-user access, role permissions, sharing).</li>
                <li><strong>Enable and support Partner Designer functionality</strong> (see Section 6).</li>
                <li><strong>Maintain security and integrity</strong> (fraud prevention, access control, monitoring, debugging).</li>
                <li><strong>Improve and develop the Services</strong> (product analytics, feature testing, performance optimization, research and development).</li>
                <li><strong>Provide customer support</strong> and respond to inquiries.</li>
                <li><strong>Send service communications</strong> (technical notices, confirmations, updates, security alerts).</li>
                <li><strong>Send marketing communications</strong> (where permitted by law and subject to your choices).</li>
                <li><strong>Enforce our terms and policies</strong> and comply with legal obligations.</li>
              </ol>
              <p className="mt-2">
                We may also use information in <strong>aggregated or de-identified</strong> form for analytics, benchmarking, product improvement, and business planning, to the extent permitted by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">5) How We Disclose Information</h2>
              <p>We may disclose information in the following circumstances:</p>
              
              <h3 className="text-lg font-bold mt-4 mb-2">A) Service providers (processors)</h3>
              <p>We may share information with vendors and service providers that help us run the Services (e.g., hosting, databases, analytics, customer support tools, communications tools, security monitoring). They are authorized to use information only as necessary to provide services to us.</p>

              <h3 className="text-lg font-bold mt-4 mb-2">B) Affiliates</h3>
              <p>We may share information with our affiliates and related entities for internal business purposes consistent with this Privacy Policy.</p>

              <h3 className="text-lg font-bold mt-4 mb-2">C) Legal, safety, and enforcement</h3>
              <p>We may disclose information if we believe it is necessary to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>comply with law, regulation, legal process, or governmental request,</li>
                <li>enforce our agreements or policies,</li>
                <li>protect the rights, safety, and security of Company, users, or others,</li>
                <li>detect, prevent, or address fraud, misuse, or security issues.</li>
              </ul>

              <h3 className="text-lg font-bold mt-4 mb-2">D) Business transfers</h3>
              <p>If we are involved in a merger, acquisition, financing, reorganization, bankruptcy, or sale of assets, information may be transferred as part of that transaction.</p>

              <h3 className="text-lg font-bold mt-4 mb-2">E) With your direction</h3>
              <p>We may share information when you direct us to (e.g., enabling integrations, inviting users, or requesting Designer involvement).</p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">6) Partner Designer Functionality and Design Transactions</h2>
              <p>This section is specific to your request and is intended to clearly allocate responsibilities and limit Company liability.</p>

              <h3 className="text-lg font-bold mt-4 mb-2">6.1 Designers are not Company employees</h3>
              <p>Partner Designers are <strong>not employed by Company</strong>. They are independent contractors or third-party providers and may operate under their own policies and practices.</p>

              <h3 className="text-lg font-bold mt-4 mb-2">6.2 What we share with a Designer through the platform</h3>
              <p>If you use Partner Designer functionality, Company may share <strong>only the information reasonably necessary</strong> to complete the Design Transaction you requested. Depending on the project, this may include:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>your name and contact details (e.g., email),</li>
                <li>business name and general business context (e.g., restaurant type),</li>
                <li>design requirements you submit (brief, scope, preferences),</li>
                <li>brand assets you provide (logos, fonts, colors),</li>
                <li>menu content or layout content you request the Designer to work on,</li>
                <li>project status information needed to coordinate delivery.</li>
              </ul>
              <p className="mt-2"><strong>We do not intend to share more than is necessary</strong> for the Designer to complete the work you requested through the platform.</p>

              <h3 className="text-lg font-bold mt-4 mb-2">6.3 Information you share directly with a Designer (outside the platform)</h3>
              <p>If you choose to communicate with a Designer outside the Services (e.g., personal email, phone, text, file-sharing links), you do so at your discretion.</p>
              <p><strong>Company is not responsible or liable for:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>information you share directly with a Designer outside the platform,</li>
                <li>the Designer’s privacy, security, storage, or use of that information,</li>
                <li>any disclosures, losses, or disputes arising from off-platform communications.</li>
              </ul>

              <h3 className="text-lg font-bold mt-4 mb-2">6.4 Disputes are between you and the Designer</h3>
              <p>To the maximum extent permitted by law, disputes regarding Designer conduct, deliverables, scope, quality, timelines, communications, or Designer communications are between you and the Designer. Company is not a party to that relationship.</p>

              <h3 className="text-lg font-bold mt-4 mb-2">6.5 Designer as separate recipient of information</h3>
              <p>A Designer who receives information for a Design Transaction may be considered a <strong>separate business</strong> with respect to the data they receive. Their handling of information is governed by their own practices, and you are responsible for reviewing/agreeing to any Designer terms or policies presented to you.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">7) Data Retention</h2>
              <p>We retain information for as long as reasonably necessary to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>provide the Services,</li>
                <li>maintain your account and content,</li>
                <li>comply with legal obligations,</li>
                <li>resolve disputes, and</li>
                <li>enforce our agreements.</li>
              </ul>
              <p className="mt-2">Retention periods can vary depending on the type of data, how it is used, and applicable legal requirements. We may retain aggregated or de-identified information longer.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">8) Security</h2>
              <p>We use reasonable administrative, technical, and physical safeguards designed to protect information. However, <strong>no security system is impenetrable</strong>, and we cannot guarantee absolute security. You are responsible for maintaining the confidentiality of your credentials and restricting access to your account.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">9) Your Choices and Controls</h2>
              <p>Depending on your location and how you use the Services, you may have options to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>update account/profile information,</li>
                <li>manage user permissions within your organization,</li>
                <li>opt out of marketing emails (via unsubscribe links),</li>
                <li>restrict cookies through browser settings (where applicable).</li>
              </ul>
              <p className="mt-2">If you disable certain cookies or tracking technologies, some features may not function properly.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">10) Cookies and Analytics</h2>
              <p>We may use cookies, pixels, local storage, and similar technologies to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>keep you logged in,</li>
                <li>remember preferences,</li>
                <li>understand usage and improve performance,</li>
                <li>measure marketing effectiveness (where permitted).</li>
              </ul>
              <p className="mt-2">You can control cookies via browser settings and other tools. Some cookies are required for core functionality.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">11) Children’s Privacy</h2>
              <p>The Services are not directed to children under 13 (or under 16 in certain jurisdictions), and we do not knowingly collect personal information from children. If you believe a child has provided information, contact us so we can take appropriate steps.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">12) Business Customers and Customer Data</h2>
              <p>If you use the Services on behalf of a business or organization:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>you are responsible for ensuring you have the right to upload and process Customer Data (including any personal information contained in it),</li>
                <li>you are responsible for providing notices and obtaining consents required by law for any end-user or customer data you place into the Services,</li>
                <li>Company processes Customer Data to provide the Services and for purposes described in this Privacy Policy.</li>
              </ul>
              <p className="mt-2">If needed, we may provide a data processing addendum (DPA) upon request.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">13) Jurisdiction-Specific Rights</h2>
              <p>Depending on your state/country, you may have rights such as access, correction, deletion, portability, or objection/opt-out of certain processing. Where legally required, we will provide applicable rights and methods to submit requests. We may need to verify your identity and authority before fulfilling requests.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">14) Changes to this Privacy Policy</h2>
              <p>We may update this Privacy Policy from time to time. The “Last Updated” date will reflect changes. If changes are material, we may provide additional notice as required by law. Continued use of the Services after changes becomes effective constitutes acceptance.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">15) Contact Us</h2>
              <p><strong>Accel Analysis Business Solutions / AccelRestaurants</strong></p>
              <p><strong>Privacy Contact Email:</strong> privacy@accelanalysis.com</p>
              <p><strong>Support Email:</strong> support@accelanalysis.com</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
