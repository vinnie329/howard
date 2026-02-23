import Link from 'next/link';
import '../lab.css';

const variants = [
  { id: 'a', title: 'Widget Grid', description: 'Mixed-size cards, iOS widget density' },
  { id: 'b', title: 'Morning Brief', description: 'Narrow centered column, stacked cards' },
  { id: 'c', title: 'Bento', description: 'Strict 2x3 grid, equal weight per card' },
  { id: 'd', title: 'Magazine', description: 'Hero outlook card, supporting grid below' },
  { id: 'e', title: 'Terminal', description: 'Monospace, data-dense, no chrome' },
  { id: 'f', title: 'Sparse Canvas', description: 'Generous whitespace, asymmetric placement' },
];

export default function BriefingsIndex() {
  return (
    <div className="lab">
      <Link href="/lab" className="lab-back">
        &larr; Lab
      </Link>
      <div className="lab-title">
        Daily Briefings <span>({variants.length})</span>
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
                href={`/lab/briefings/${v.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="lab-open-btn"
              >
                Open ↗
              </a>
            </div>
            <div className="lab-iframe-wrap">
              <iframe src={`/lab/briefings/${v.id}`} tabIndex={-1} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
