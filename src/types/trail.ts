export type TrailNodeType = 'highlight' | 'note' | 'book' | 'concept' | 'synthesis';

export type TrailSource = 'backlink' | 'related-idea' | 'synthesis-citation' | 'graph-click';

export interface TrailStep {
  id: string;
  sessionId: string;
  fromType: TrailNodeType;
  fromId: string;
  fromBookId?: string;
  toType: TrailNodeType;
  toId: string;
  toBookId?: string;
  source: TrailSource;
  timestamp: string;
}
