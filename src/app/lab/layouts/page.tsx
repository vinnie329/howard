import Link from 'next/link';
import '../lab.css';

const variants = [
  {
    id: 'a',
    title: 'Current',
    description: 'Three-panel dashboard — trending, feed, watchlist',
  },
  {
    id: 'b',
    title: 'Quiet Two-Panel',
    description: 'Wider feed with expand-on-click cards, tabbed right panel',
  },
  {
    id: 'c',
    title: 'Card Grid',
    description: 'Full-width grid of vertical cards, no pulse, no trending',
  },
];

export default function LayoutsIndex() {
  return (
    <div className="lab">
      <Link href="/lab" className="lab-back">
        &larr; Lab
      </Link>
      <div className="lab-title">
        Layouts <span>({variants.length})</span>
      </div>
      <div className="lab-layout-grid">
        {variants.map((v) => (
          <div key={v.id} className="lab-layout-card">
            <div className="lab-layout-card-header">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flex: 1, minWidth: 0 }}>
                <h3>{v.title}</h3>
                <p>{v.description}</p>
              </div>
              <a
                href={`/lab/layouts/${v.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="lab-open-btn"
              >
                Open ↗
              </a>
            </div>
            <div className="lab-iframe-wrap">
              <iframe src={`/lab/layouts/${v.id}`} tabIndex={-1} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
