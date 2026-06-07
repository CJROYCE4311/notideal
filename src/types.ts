export interface Segment {
  id: string;
  name: string;
  tag: string;
  description: string;
  impact: 'not-ideal' | 'favorable' | 'normal' | 'wildcard' | 'opponent';
  backgroundColor: string;
  textColor: string;
}

export interface SpinLog {
  id: string;
  clubName: string;
  tag: string;
  timestamp: string;
  ratingValue: 'heroic' | 'not-ideal' | 'shanked' | 'unrated';
}
