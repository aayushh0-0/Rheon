import React from 'react';
import {
  HelpCircle,
  PhoneCall,
  AlertTriangle,
  Building2,
} from 'lucide-react';

export const PatientGuidanceView: React.FC = () => {
  const faqs = [
    {
      q: 'Can O-negative blood be given to anyone in an acute emergency?',
      a: 'O-negative RBCs have neither A nor B antigens and are RhD-negative, making them the universal emergency red blood cell donor when immediate uncrossmatched transfusion is required before complete type-and-screen testing.',
    },
    {
      q: 'What is cold-chain protection during transport?',
      a: 'Blood products are biologically perishable and must remain within precise temperature boundaries (e.g., RBCs between 2°C and 6°C, Platelets between 20°C and 24°C with gentle agitation). RHEON verifies continuous IoT temperature telemetry before units can be released to doctors.',
    },
    {
      q: 'How does drone dispatch work in Delhi NCR?',
      a: 'Drones operate along pre-cleared aerial corridors between accredited central blood hubs (such as Rotary and Red Cross) and designated hospital trauma rooftop landing pads, avoiding ground traffic delays during peak transit hours.',
    },
    {
      q: 'What should I do if blood is needed immediately in the operating room?',
      a: 'The treating hospital blood bank will issue immediate uncrossmatched O-negative emergency stock while RHEON automatically replenishes the hospital safety reserve and coordinates crossmatched units.',
    },
  ];

  const emergencyContacts = [
    { name: 'National Emergency Dispatch', number: '112', type: 'Immediate Police / Ambulance / Fire' },
    { name: 'National Ambulance Service', number: '102', type: 'Medical Emergency Transport' },
    { name: 'AIIMS Apex Trauma Centre', number: '+91 11 2658 8500', type: 'Level 1 Trauma Emergency' },
    { name: 'Safdarjung Hospital Emergency', number: '+91 11 2616 5060', type: 'Level 1 Trauma Care' },
    { name: 'Indian Red Cross Central Blood Hub', number: '+91 11 2371 6441', type: '24/7 Regional Blood Bank' },
    { name: 'Rotary Blood Bank Tughlakabad', number: '+91 11 2995 5566', type: 'Central Regional Logistics' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-ink-primary tracking-tight">
          Help & Emergency Guidance
        </h2>
        <p className="text-xs md:text-sm text-ink-secondary mt-0.5">
          Essential protocols, helpline numbers, and FAQs for patients and caregivers during emergency blood requirements.
        </p>
      </div>

      {/* Emergency Immediate Action Card */}
      <div className="p-5 bg-pastel-rose-bg border border-pastel-rose-border rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-crimson text-white flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-pastel-rose-text">
              Immediate Critical Medical Emergency
            </h3>
            <p className="text-xs text-pastel-rose-text/90 mt-0.5">
              If the patient requires urgent resuscitation or acute stabilization, alert attending ICU/ER doctors immediately or dial 112.
            </p>
          </div>
        </div>

        <a
          href="tel:112"
          className="px-5 py-2.5 bg-crimson hover:bg-crimson-hover text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-2 shadow-sm transition-colors"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Call 112 STAT</span>
        </a>
      </div>

      {/* Emergency Helplines Directory */}
      <div className="bg-white rounded-3xl p-6 border border-shell-border shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-teal-brand" />
          <h3 className="text-sm sm:text-base font-bold text-ink-primary">
            Delhi NCR Emergency Hotlines & Facilities
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {emergencyContacts.map((contact, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-shell-bg border border-shell-border flex items-center justify-between gap-2"
            >
              <div>
                <h4 className="text-xs font-bold text-ink-primary">{contact.name}</h4>
                <p className="text-[11px] text-ink-secondary">{contact.type}</p>
              </div>
              <a
                href={`tel:${contact.number.replace(/\s+/g, '')}`}
                className="px-3 py-1.5 bg-white hover:bg-shell-card-subtle border border-shell-border text-teal-brand font-mono font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
              >
                <PhoneCall className="w-3 h-3" />
                <span>{contact.number}</span>
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="bg-white rounded-3xl p-6 border border-shell-border shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-4 h-4 text-teal-brand" />
          <h3 className="text-sm sm:text-base font-bold text-ink-primary">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-shell-bg/60 border border-shell-border"
            >
              <h4 className="text-xs sm:text-sm font-bold text-ink-primary flex items-start gap-2">
                <span className="text-teal-brand font-mono">Q{idx + 1}.</span>
                <span>{faq.q}</span>
              </h4>
              <p className="text-xs text-ink-secondary mt-1.5 pl-6 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
