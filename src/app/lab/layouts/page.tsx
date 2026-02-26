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
  {
    id: 'd',
    title: 'Vercel / Geist',
    description: 'Minimal top-nav, content-first feed, sticky sidebar panels',
  },
  {
    id: 'e',
    title: 'Brutalist Light',
    description: 'Light bg, hard borders, data rows with hover inversion, large type hero',
  },
  {
    id: 'f',
    title: 'Broadsheet',
    description: 'Newspaper columns, serif headlines, lead story with sidebar predictions',
  },
  {
    id: 'g',
    title: 'Terminal',
    description: 'Full dark monospace, command-line aesthetic, dense data grid',
  },
  {
    id: 'h',
    title: 'Accordion Panels',
    description: 'Stacked full-width sections that expand on click, light bg with inversion',
  },
  {
    id: 'i',
    title: 'Dense Ticker Board',
    description: 'Four-column data wall — outlooks, feed, predictions, themes side by side',
  },
  {
    id: 'j',
    title: 'Split Thesis',
    description: 'Dark left thesis panel, light right evidence panel, dual-tone split screen',
  },
  {
    id: 'k',
    title: 'Index',
    description: 'Single-column table of contents, large index numbers, hover arrows',
  },
  {
    id: 'l',
    title: 'Kanban',
    description: 'Three swim lanes by time horizon with intelligence cards and predictions',
  },
  {
    id: 'm',
    title: 'Focus Reader',
    description: 'One item at a time, full-screen canvas, prev/next navigation strip',
  },
  {
    id: 'n',
    title: 'Specimen Manager',
    description: 'Three-panel dark app: left nav, center list, right inspector with theme grid',
  },
  {
    id: 'o',
    title: 'Outlook Inspector',
    description: 'Three-panel outlook deep-dive: horizons nav, cards, thesis/positioning detail',
  },
  {
    id: 'p',
    title: 'Predictions Tracker',
    description: 'Filterable prediction list with detail inspector, metrics, and asset grid',
  },
  {
    id: 'q',
    title: 'Source Matrix',
    description: 'Auto-fill grid of source cards, each with their latest intelligence items',
  },
  {
    id: 'r',
    title: 'Tabbed Workspace',
    description: 'Full-width tabbed views: feed, outlook, predictions, themes grid',
  },
  {
    id: 's',
    title: 'Dashboard Grid',
    description: 'Fixed-height CSS grid of panels — everything visible, no scrolling needed',
  },
  {
    id: 't',
    title: 'Stacked Modules',
    description: 'Numbered full-width modules with sticky headers, glyph-grid themes',
  },
  {
    id: 'u',
    title: 'Sidebar Commander',
    description: 'Wide sidebar with outlooks/themes, split list/detail like a mail client',
  },
  {
    id: 'e1',
    title: 'E · Header Tabs',
    description: 'Tabs in header grid replacing stat cells, content swaps below hero',
  },
  {
    id: 'e2',
    title: 'E · Pill Tabs',
    description: 'Inverted pill tabs between condensed outlook strip and content area',
  },
  {
    id: 'e3',
    title: 'E · Vertical Rail',
    description: 'Narrow left rail with vertical text labels, content fills right side',
  },
  {
    id: 'e4',
    title: 'E · Bottom Bar',
    description: 'Mobile-style bottom tab bar with icons, full-height scroll above',
  },
  {
    id: 'e5',
    title: 'E · Segmented Split',
    description: 'Compact segmented control in header, main + contextual sidebar',
  },
  {
    id: 'e6',
    title: 'E · Section Tabs',
    description: 'Full-width equal grid cell tabs, overview with hero + split panels',
  },
  {
    id: 'e7',
    title: 'E · Horizon Tabs',
    description: 'Time horizon tabs (Short/Medium/Long), outlook hero + filtered predictions',
  },
  {
    id: 'e8',
    title: 'E · Dual Tabs',
    description: 'Two tab levels: primary content type + secondary sentiment filter',
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
