import { Segment } from './types';

export const defaultSegments: Segment[] = [
  {
    id: 'driver',
    name: 'Driver',
    tag: 'The Big Dog',
    description: 'Time to attempt a 250-yard hero slice from the deep pine forest!',
    impact: 'not-ideal',
    backgroundColor: '#3b0764', // Deep Purple
    textColor: '#f59e0b'     // Gold Accent
  },
  {
    id: '5w-3h',
    name: '5 Wood / 3 Hybrid',
    tag: 'Woods Out of Rough',
    description: 'A long shaft out of the thick clover weeds. Swing with hope!',
    impact: 'not-ideal',
    backgroundColor: '#110b1a', // Smoky Dark Gray/Black
    textColor: '#ecebf0'
  },
  {
    id: '7w-4h',
    name: '7 Wood / 4 Hybrid',
    tag: 'Long Shot Gamble',
    description: 'An unusual wood weight. Smooth acceleration or count on a slice.',
    impact: 'normal',
    backgroundColor: '#d4af37', // Shiny Gold
    textColor: '#0c0a0f'
  },
  {
    id: '9w-5h-5i',
    name: '9 Wood / 5H / 5 Iron',
    tag: 'The Mid-Utility Mix',
    description: 'Choose any of these three. They will all clip the tree branches.',
    impact: 'normal',
    backgroundColor: '#2e1065', // Royal Dark Violet
    textColor: '#ffffff'
  },
  {
    id: '6i-6h',
    name: '6 Iron / 6 Hybrid',
    tag: 'The Mid-Iron Gamble',
    description: 'Requires a clean, sweeping strike. Careful not to chunk it.',
    impact: 'normal',
    backgroundColor: '#110b1a',
    textColor: '#d4af37'
  },
  {
    id: '7iron',
    name: '7 Iron',
    tag: 'The Ol\' Reliable',
    description: 'Finally! A trustworthy, normal iron. Keep it simple.',
    impact: 'favorable',
    backgroundColor: '#d4af37',
    textColor: '#0c0a0f'
  },
  {
    id: '8iron',
    name: '8 Iron',
    tag: 'High Flight Attack',
    description: 'Standard mid-range approach. Control the wind and seek the pin.',
    impact: 'favorable',
    backgroundColor: '#2e1065',
    textColor: '#ffffff'
  },
  {
    id: '9iron',
    name: '9 Iron',
    tag: 'Pin Seeker',
    description: 'Beautiful utility loft. A smooth 3/4 turn towards the green.',
    impact: 'favorable',
    backgroundColor: '#110b1a',
    textColor: '#f59e0b'
  },
  {
    id: 'pw',
    name: 'PW (Pitching)',
    tag: 'Scoring Wedge',
    description: 'Short and sweet. Solid ball-first contact will put you close.',
    impact: 'favorable',
    backgroundColor: '#d4af37',
    textColor: '#0c0a0f'
  },
  {
    id: 'aw',
    name: 'AW (Approach)',
    tag: 'The Gap Closer',
    description: 'Perfect weight bridge. Hit a gentle, lazy fade over the bunkers.',
    impact: 'favorable',
    backgroundColor: '#2e1065',
    textColor: '#eab308'
  },
  {
    id: 'sw',
    name: 'SW (Sand)',
    tag: 'Beach Controller',
    description: 'Perfect for popping the ball high up, or sliding under deep grass.',
    impact: 'favorable',
    backgroundColor: '#110b1a',
    textColor: '#ffffff'
  },
  {
    id: 'lw',
    name: 'LW (Lob)',
    tag: 'The Flopper Block',
    description: 'Expect to skull this at 120mph directly past the green into the lake.',
    impact: 'not-ideal',
    backgroundColor: '#d4af37',
    textColor: '#0c0a0f'
  },
  {
    id: 'putter',
    name: 'Putter',
    tag: 'The Flatstick',
    description: 'Putter out of the deep tall rough! channels your inner hockey star.',
    impact: 'not-ideal',
    backgroundColor: '#1b0d2d',
    textColor: '#f43f5e'
  },
  {
    id: 'opponent',
    name: 'Opponent\'s Choice',
    tag: 'The Ultimate Sabotage',
    description: 'Your smiling opponents handpick your club. Ready that poker face!',
    impact: 'opponent',
    backgroundColor: '#4c0519', // Dark Crimson
    textColor: '#fecdd3'
  },
  {
    id: 'wildcard',
    name: 'Wildcard (Spinner\'s Choice)',
    tag: 'Spinner\'s Jackpot',
    description: 'Ultimate personal freedom! Select any club you want to Hit.',
    impact: 'wildcard',
    backgroundColor: '#064e3b', // Emerald Green
    textColor: '#34d399'
  }
];
