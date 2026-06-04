export type BacklinkTargetType = 'note' | 'book' | 'highlight';

export interface Backlink {
  id: string;
  sourceId: string;
  targetId: string;
  targetType: BacklinkTargetType;
  createdAt: string;
}
