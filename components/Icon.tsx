import { createElement } from 'react';

// Outline icons, path data from Lucide (ISC licence, lucide.dev), inlined so the site keeps three runtime
// dependencies. Colour comes from the text colour (currentColor) of the class passed in.
type Node = [string, Record<string, string>];
const P = (...d: string[]): Node[] => d.map((x) => ['path', { d: x }]);
const ICONS = {
  scale: P('M12 3v18', 'm19 8 3 8a5 5 0 0 1-6 0zV7', 'M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1', 'm5 8 3 8a5 5 0 0 1-6 0zV7', 'M7 21h10'),
  arrowRight: P('M5 12h14', 'm12 5 7 7-7 7'),
  arrowLeft: P('m12 19-7-7 7-7', 'M19 12H5'),
  check: P('M20 6 9 17l-5-5'),
  mail: [...P('m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7'), ['rect', { x: '2', y: '4', width: '20', height: '16', rx: '2' }]],
  calendar: [...P('M8 2v4', 'M16 2v4', 'M3 10h18', 'm9 16 2 2 4-4'), ['rect', { width: '18', height: '18', x: '3', y: '4', rx: '2' }]],
  search: [...P('m21 21-4.34-4.34'), ['circle', { cx: '11', cy: '11', r: '8' }]],
  hammer: P('m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9', 'm18 15 4-4',
    'm21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5'),
  serverCog: P('m10.852 14.772-.383.923', 'M13.148 14.772a3 3 0 1 0-2.296-5.544l-.383-.923', 'm13.148 9.228.383-.923',
    'm13.53 15.696-.382-.924a3 3 0 1 1-2.296-5.544', 'm14.772 10.852.923-.383', 'm14.772 13.148.923.383',
    'M4.5 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-.5',
    'M4.5 14H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-.5', 'M6 18h.01', 'M6 6h.01',
    'm9.228 10.852-.923-.383', 'm9.228 13.148-.923.383'),
  compass: [['circle', { cx: '12', cy: '12', r: '10' }],
    ...P('m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z')],
  fileText: P('M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z',
    'M14 2v5a1 1 0 0 0 1 1h5', 'M10 9H8', 'M16 13H8', 'M16 17H8'),
  shieldCheck: P('M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
    'm9 12 2 2 4-4'),
  lock: [['rect', { width: '18', height: '11', x: '3', y: '11', rx: '2', ry: '2' }], ...P('M7 11V7a5 5 0 0 1 10 0v4')],
  gitBranch: [...P('M15 6a9 9 0 0 0-9 9V3'), ['circle', { cx: '18', cy: '6', r: '3' }], ['circle', { cx: '6', cy: '18', r: '3' }]],
  ruler: P('M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z',
    'm14.5 12.5 2-2', 'm11.5 9.5 2-2', 'm8.5 6.5 2-2', 'm17.5 15.5 2-2'),
  flask: P('M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2',
    'M6.453 15h11.094', 'M8.5 2h7'),
  code: P('m18 16 4-4-4-4', 'm6 8-4 4 4 4', 'm14.5 4-5 16'),
  eye: [...P('M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0'),
    ['circle', { cx: '12', cy: '12', r: '3' }]],
} satisfies Record<string, Node[]>;
export type IconName = keyof typeof ICONS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      {(ICONS[name] as Node[]).map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
