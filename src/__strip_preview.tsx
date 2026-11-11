import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { CrmCapacityMeter } from '@/components/crm/CrmCapacityMeter';

const base = {
  limit: 2000,
  baseLimit: 1000,
  extraContacts: 1000,
  extraPacks: 1,
  hasLimit: true,
  atLimit: false,
  nearLimit: false,
  onUpgrade: () => {},
};

function Section({ title, dark, children }: { title: string; dark: boolean; children: React.ReactNode }) {
  return (
    <section className={dark ? 'dark' : ''}>
      <div className="bg-background px-6 py-6">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        {children}
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <div>
    <Section title="claro · normal" dark={false}>
      <CrmCapacityMeter {...base} count={640} />
      <CrmCapacityMeter {...base} count={1200} extraPacks={1} />
      <CrmCapacityMeter {...base} count={1850} nearLimit />
      <CrmCapacityMeter {...base} count={2000} nearLimit atLimit />
      <CrmCapacityMeter {...base} hasLimit={false} limit={Infinity} baseLimit={Infinity} extraPacks={0} extraContacts={0} count={47} />
    </Section>
    <Section title="escuro" dark>
      <CrmCapacityMeter {...base} count={640} />
      <CrmCapacityMeter {...base} count={1200} extraPacks={1} />
      <CrmCapacityMeter {...base} count={1850} nearLimit />
      <CrmCapacityMeter {...base} count={2000} nearLimit atLimit />
      <CrmCapacityMeter {...base} hasLimit={false} limit={Infinity} baseLimit={Infinity} extraPacks={0} extraContacts={0} count={47} />
    </Section>
  </div>,
);
