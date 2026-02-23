import Link from 'next/link';
import './lab.css';

const sections = [
  { name: 'Daily Briefings', href: '/lab/briefings', count: 6 },
  { name: 'Layouts', href: '/lab/layouts', count: 5 },
  { name: 'Components', href: '/lab/components', count: 3 },
];

export default function LabIndex() {
  return (
    <div className="lab">
      <div className="lab-title">
        <span>Lab</span>
      </div>
      <div className="lab-sections">
        {sections.map((s) => (
          <Link key={s.name} href={s.href} className="lab-section-link">
            <h2>{s.name}</h2>
            <span className="count">{s.count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
