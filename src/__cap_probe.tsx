import { createRoot } from 'react-dom/client';
import { CrmCapacityMeter } from '@/components/crm/CrmCapacityMeter';

const cases = [
  { title: 'normal', props: { count: 640, limit: 1000, baseLimit: 1000, extraContacts: 0, extraPacks: 0, hasLimit: true, atLimit: false, nearLimit: false } },
  { title: 'add-on', props: { count: 1200, limit: 2000, baseLimit: 1000, extraContacts: 1000, extraPacks: 1, hasLimit: true, atLimit: false, nearLimit: false } },
  { title: 'near', props: { count: 920, limit: 1000, baseLimit: 1000, extraContacts: 0, extraPacks: 0, hasLimit: true, atLimit: false, nearLimit: true } },
  { title: 'full', props: { count: 1000, limit: 1000, baseLimit: 1000, extraContacts: 0, extraPacks: 0, hasLimit: true, atLimit: true, nearLimit: true } },
];

const host = document.createElement('div');
host.id = 'cap-probe-host';
host.style.cssText = 'position:fixed;inset:0;z-index:99999;overflow:auto;background:hsl(var(--background));padding:24px;';
document.body.appendChild(host);

const wrap = document.createElement('div');
wrap.style.cssText = 'display:grid;gap:24px;';
host.appendChild(wrap);

createRoot(wrap).render(
  cases.map((c) => (
    <div key={c.title} id={`case-${c.title}`}>
      <CrmCapacityMeter {...c.props} onUpgrade={() => {}} />
    </div>
  )),
);
