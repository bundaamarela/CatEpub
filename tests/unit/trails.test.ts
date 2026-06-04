import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/lib/db/schema';
import {
  buildTrailGraph,
  getCurrentSessionTrail,
  getTodayTrail,
  recordStep,
  startNewSession,
} from '@/lib/knowledge/trails';

describe('reading trails', () => {
  beforeEach(async () => {
    await db.trailSteps.clear();
    startNewSession();
  });

  it('records a step with the active session', async () => {
    await recordStep({
      fromType: 'highlight',
      fromId: 'h1',
      fromBookId: 'b1',
      toType: 'book',
      toId: 'b2',
      toBookId: 'b2',
      source: 'graph-click',
    });

    const trail = await getCurrentSessionTrail();
    expect(trail).toHaveLength(1);
    expect(trail[0]!.source).toBe('graph-click');
    expect(trail[0]!.fromBookId).toBe('b1');
    expect(trail[0]!.toBookId).toBe('b2');
  });

  it('returns steps sorted by timestamp ascending', async () => {
    await recordStep({
      fromType: 'highlight',
      fromId: 'h1',
      toType: 'highlight',
      toId: 'h2',
      source: 'related-idea',
    });
    await new Promise((r) => setTimeout(r, 5));
    await recordStep({
      fromType: 'highlight',
      fromId: 'h2',
      toType: 'highlight',
      toId: 'h3',
      source: 'related-idea',
    });

    const trail = await getCurrentSessionTrail();
    expect(trail[0]!.toId).toBe('h2');
    expect(trail[1]!.toId).toBe('h3');
  });

  it('isolates sessions', async () => {
    await recordStep({
      fromType: 'highlight',
      fromId: 'h1',
      toType: 'highlight',
      toId: 'h2',
      source: 'related-idea',
    });

    startNewSession();
    await recordStep({
      fromType: 'highlight',
      fromId: 'hA',
      toType: 'highlight',
      toId: 'hB',
      source: 'related-idea',
    });

    const second = await getCurrentSessionTrail();
    expect(second).toHaveLength(1);
    expect(second[0]!.fromId).toBe('hA');
  });

  it('getTodayTrail returns steps from today only', async () => {
    await recordStep({
      fromType: 'book',
      fromId: 'b1',
      fromBookId: 'b1',
      toType: 'book',
      toId: 'b2',
      toBookId: 'b2',
      source: 'graph-click',
    });

    const today = await getTodayTrail();
    expect(today).toHaveLength(1);
  });

  it('buildTrailGraph aggregates book-to-book transitions', async () => {
    await recordStep({
      fromType: 'book',
      fromId: 'b1',
      fromBookId: 'b1',
      toType: 'book',
      toId: 'b2',
      toBookId: 'b2',
      source: 'graph-click',
    });
    await recordStep({
      fromType: 'book',
      fromId: 'b1',
      fromBookId: 'b1',
      toType: 'book',
      toId: 'b2',
      toBookId: 'b2',
      source: 'graph-click',
    });
    await recordStep({
      fromType: 'book',
      fromId: 'b1',
      fromBookId: 'b1',
      toType: 'book',
      toId: 'b3',
      toBookId: 'b3',
      source: 'synthesis-citation',
    });

    const graph = await buildTrailGraph();
    expect(graph.totalSteps).toBe(3);
    expect(graph.edges).toHaveLength(2);
    expect(graph.edges[0]).toEqual({ fromBookId: 'b1', toBookId: 'b2', count: 2 });
    expect(graph.edges[1]).toEqual({ fromBookId: 'b1', toBookId: 'b3', count: 1 });
  });

  it('ignores self-referential transitions in the trail graph', async () => {
    await recordStep({
      fromType: 'highlight',
      fromId: 'h1',
      fromBookId: 'b1',
      toType: 'highlight',
      toId: 'h2',
      toBookId: 'b1',
      source: 'related-idea',
    });

    const graph = await buildTrailGraph();
    expect(graph.edges).toHaveLength(0);
  });

  it('skips edges when book IDs are missing', async () => {
    await recordStep({
      fromType: 'synthesis',
      fromId: 'synthesis',
      toType: 'highlight',
      toId: 'h1',
      source: 'synthesis-citation',
    });

    const graph = await buildTrailGraph();
    expect(graph.totalSteps).toBe(1);
    expect(graph.edges).toHaveLength(0);
  });
});
