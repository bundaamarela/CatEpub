import { ulid } from 'ulid';

import type { Backlink } from '@/types/backlink';
import * as backlinksDb from '@/lib/db/backlinks';
import * as booksDb from '@/lib/db/books';
import * as notesDb from '@/lib/db/notes';
import { extractLinks, resolveLink } from './backlinks';

export const refreshBacklinksForSource = async (
  sourceId: string,
  body: string,
): Promise<void> => {
  const linkTexts = extractLinks(body);
  if (linkTexts.length === 0) {
    await backlinksDb.removeBySource(sourceId);
    return;
  }

  const [notes, books] = await Promise.all([notesDb.getAll(), booksDb.getAll()]);
  const now = new Date().toISOString();
  const links: Backlink[] = [];

  for (const text of linkTexts) {
    const resolved = resolveLink(text, notes, books);
    if (resolved === null) continue;
    if (links.some((l) => l.targetId === resolved.id)) continue;
    links.push({
      id: ulid(),
      sourceId,
      targetId: resolved.id,
      targetType: resolved.type,
      createdAt: now,
    });
  }

  await backlinksDb.replaceForSource(sourceId, links);
};
