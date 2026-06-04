import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';

import { CatEmpty } from '@/components/icons';
import { isAiEnabled } from '@/lib/ai/client';
import {
  detectContradictions,
  type Contradiction,
  type ContradictionVerdict,
} from '@/lib/knowledge/contradictions';
import { buildSemanticEdges, type Edge, type GraphNode } from '@/lib/knowledge/graph';
import { recordStep } from '@/lib/knowledge/trails';
import { useAllHighlights } from '@/lib/store/highlights';
import { useBooks } from '@/lib/store/library';
import { cn } from '@/lib/utils/cn';
import type { Book } from '@/types/book';
import type { Highlight } from '@/types/highlight';
import styles from './Graph.module.css';

const BOOK_COLORS = [
  '#e07060', '#60a0e0', '#60c080', '#d0a050',
  '#a070d0', '#50b0b0', '#d07090', '#80b040',
];

const bookColor = (bookId: string, bookIds: string[]): string => {
  const idx = bookIds.indexOf(bookId);
  return BOOK_COLORS[idx % BOOK_COLORS.length] ?? BOOK_COLORS[0] ?? '#888';
};

interface SidebarInfo {
  node: GraphNode;
  highlight: Highlight;
}

const Graph = () => {
  const booksQuery = useBooks();
  const highlightsQuery = useAllHighlights();
  const navigate = useNavigate();

  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<SidebarInfo | null>(null);
  const [computing, setComputing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [threshold, setThreshold] = useState(0.78);
  const [filterBookId, setFilterBookId] = useState<string>('');
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: Edge[] } | null>(null);
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [detectingContradictions, setDetectingContradictions] = useState(false);

  const allBooks: ReadonlyArray<Book> = useMemo(() => booksQuery.data ?? [], [booksQuery.data]);
  const allHighlights: ReadonlyArray<Highlight> = useMemo(
    () => highlightsQuery.data ?? [],
    [highlightsQuery.data],
  );

  const bookIds = useMemo(() => [...new Set(allHighlights.map((h) => h.bookId))], [allHighlights]);

  const handleCompute = useCallback(() => {
    if (allHighlights.length < 10 || computing) return;
    setComputing(true);
    setProgress(0);

    void (async () => {
      const edges = await buildSemanticEdges(allHighlights, allBooks, threshold, setProgress);

      const nodeIds = new Set<string>();
      for (const e of edges) {
        nodeIds.add(e.sourceId);
        nodeIds.add(e.targetId);
      }

      const bookMap = new Map(allBooks.map((b) => [b.id, b]));
      const nodes: GraphNode[] = [];
      for (const hl of allHighlights) {
        if (!nodeIds.has(hl.id)) continue;
        const book = bookMap.get(hl.bookId);
        nodes.push({
          id: hl.id,
          label: hl.text.slice(0, 50),
          bookId: hl.bookId,
          bookTitle: book?.title ?? '',
          type: 'highlight',
        });
      }

      setGraphData({ nodes, edges });
      setComputing(false);
    })();
  }, [allHighlights, allBooks, threshold, computing]);

  const contradictionMap = useMemo(() => {
    const map = new Map<string, ContradictionVerdict>();
    for (const c of contradictions) {
      const key = [c.highlightA.id, c.highlightB.id].sort().join('::');
      map.set(key, c.verdict);
    }
    return map;
  }, [contradictions]);

  const handleDetectContradictions = useCallback(() => {
    if (detectingContradictions || graphData === null) return;
    setDetectingContradictions(true);

    void (async () => {
      const visibleIds = new Set(graphData.nodes.map((n) => n.id));
      const visibleHighlights = allHighlights.filter((h) => visibleIds.has(h.id));
      const found = await detectContradictions(visibleHighlights, allBooks);
      setContradictions(found);
      setDetectingContradictions(false);
    })();
  }, [detectingContradictions, graphData, allHighlights, allBooks]);

  const filteredData = useMemo(() => {
    if (graphData === null) return null;
    if (filterBookId === '') return graphData;
    const filteredNodes = graphData.nodes.filter((n) => n.bookId === filterBookId);
    const nodeSet = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = graphData.edges.filter(
      (e) => nodeSet.has(e.sourceId) || nodeSet.has(e.targetId),
    );
    const expandedIds = new Set<string>();
    for (const e of filteredEdges) {
      expandedIds.add(e.sourceId);
      expandedIds.add(e.targetId);
    }
    const expandedNodes = graphData.nodes.filter((n) => expandedIds.has(n.id));
    return { nodes: expandedNodes, edges: filteredEdges };
  }, [graphData, filterBookId]);

  useEffect(() => {
    const svg = svgRef.current;
    if (svg === null || filteredData === null || filteredData.nodes.length === 0) return;

    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 600;

    const sel = d3.select(svg);
    sel.selectAll('*').remove();

    const g = sel.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString());
      });
    sel.call(zoom);

    type SimNode = GraphNode & d3.SimulationNodeDatum;
    type SimLink = {
      source: SimNode;
      target: SimNode;
      similarity: number;
      verdict: ContradictionVerdict | null;
    };

    const verdictFor = (aId: string, bId: string): ContradictionVerdict | null => {
      const key = [aId, bId].sort().join('::');
      return contradictionMap.get(key) ?? null;
    };

    const verdictStroke = (v: ContradictionVerdict | null): string => {
      if (v === 'contradict') return '#c75050';
      if (v === 'tension') return '#d0903a';
      return 'var(--border-strong)';
    };

    const simNodes: SimNode[] = filteredData.nodes.map((n) => ({ ...n }));
    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = [];
    for (const e of filteredData.edges) {
      const s = nodeMap.get(e.sourceId);
      const t = nodeMap.get(e.targetId);
      if (s !== undefined && t !== undefined) {
        simLinks.push({
          source: s,
          target: t,
          similarity: e.similarity,
          verdict: verdictFor(e.sourceId, e.targetId),
        });
      }
    }

    const simulation = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink<SimNode, SimLink>(simLinks).distance(80).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(16));

    const link = g.append('g')
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', (d) => verdictStroke(d.verdict))
      .attr('stroke-opacity', (d) => (d.verdict === null ? 0.5 : 0.9))
      .attr('stroke-width', (d) => 0.5 + d.similarity * 2);

    const node = g.append('g')
      .selectAll('circle')
      .data(simNodes)
      .join('circle')
      .attr('r', 7)
      .attr('fill', (d) => bookColor(d.bookId, bookIds))
      .attr('stroke', 'var(--bg)')
      .attr('stroke-width', 1.5)
      .on('click', (_event: MouseEvent, d: SimNode) => {
        const hl = allHighlights.find((h) => h.id === d.id);
        if (hl !== undefined) setSelectedNode({ node: d, highlight: hl });
      })
      .on('dblclick', (_event: MouseEvent, d: SimNode) => {
        const hl = allHighlights.find((h) => h.id === d.id);
        if (hl !== undefined) {
          void recordStep({
            fromType: 'highlight',
            fromId: d.id,
            fromBookId: d.bookId,
            toType: 'book',
            toId: hl.bookId,
            toBookId: hl.bookId,
            source: 'graph-click',
          });
          void navigate(`/reader/${hl.bookId}`, { state: { cfi: hl.cfiRange } });
        }
      });

    const drag = d3.drag<SVGCircleElement, SimNode>()
      .on('start', (event: d3.D3DragEvent<SVGCircleElement, SimNode, SimNode>, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (_event: d3.D3DragEvent<SVGCircleElement, SimNode, SimNode>, d) => {
        d.fx = _event.x;
        d.fy = _event.y;
      })
      .on('end', (event: d3.D3DragEvent<SVGCircleElement, SimNode, SimNode>, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    (node as d3.Selection<SVGCircleElement, SimNode, SVGGElement, unknown>).call(drag);

    const labels = g.append('g')
      .selectAll('text')
      .data(simNodes)
      .join('text')
      .attr('dx', 10)
      .attr('dy', 4)
      .text((d) => d.label.slice(0, 30));

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x ?? 0)
        .attr('y1', (d) => d.source.y ?? 0)
        .attr('x2', (d) => d.target.x ?? 0)
        .attr('y2', (d) => d.target.y ?? 0);
      node
        .attr('cx', (d) => d.x ?? 0)
        .attr('cy', (d) => d.y ?? 0);
      labels
        .attr('x', (d) => d.x ?? 0)
        .attr('y', (d) => d.y ?? 0);
    });

    return () => {
      simulation.stop();
    };
  }, [filteredData, bookIds, allHighlights, navigate, contradictionMap]);

  if (allHighlights.length < 10) {
    return (
      <div className={cn(styles.page)}>
        <div className={cn(styles.header)}>
          <h1 className={cn(styles.title)}>Grafo de Ideias</h1>
        </div>
        <div className={cn(styles.empty)}>
          <CatEmpty size={48} />
          <p>Precisas de pelo menos 10 highlights para gerar o grafo.</p>
          <p>Selecciona texto nos livros para criar anotações.</p>
        </div>
      </div>
    );
  }

  if (graphData === null && !computing) {
    return (
      <div className={cn(styles.page)}>
        <div className={cn(styles.header)}>
          <h1 className={cn(styles.title)}>Grafo de Ideias</h1>
        </div>
        <div className={cn(styles.empty)}>
          <p>{allHighlights.length} highlights disponíveis.</p>
          <button type="button" className={cn(styles.computeBtn)} onClick={handleCompute}>
            Calcular ligações semânticas
          </button>
        </div>
      </div>
    );
  }

  if (computing) {
    return (
      <div className={cn(styles.page)}>
        <div className={cn(styles.header)}>
          <h1 className={cn(styles.title)}>Grafo de Ideias</h1>
        </div>
        <div className={cn(styles.progress)}>
          <span>A calcular ligações semânticas…</span>
          <div className={cn(styles.progressBar)}>
            <div className={cn(styles.progressFill)} style={{ width: `${progress}%` }} />
          </div>
          <span>{progress}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(styles.page)}>
      <div className={cn(styles.header)}>
        <h1 className={cn(styles.title)}>Grafo de Ideias</h1>
        <div className={cn(styles.controls)}>
          <select
            className={cn(styles.select)}
            value={filterBookId}
            onChange={(e) => setFilterBookId(e.target.value)}
          >
            <option value="">Todos os livros</option>
            {allBooks
              .filter((b) => bookIds.includes(b.id))
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title.slice(0, 40)}
                </option>
              ))}
          </select>
          <span className={cn(styles.sliderLabel)}>Limiar: {threshold.toFixed(2)}</span>
          <input
            type="range"
            className={cn(styles.slider)}
            min={0.7}
            max={0.95}
            step={0.01}
            value={threshold}
            onChange={(e) => {
              setThreshold(parseFloat(e.target.value));
              setGraphData(null);
            }}
          />
          {isAiEnabled() && (
            <button
              type="button"
              className={cn(styles.detectBtn)}
              onClick={handleDetectContradictions}
              disabled={detectingContradictions || graphData === null}
              title="Pede à IA para avaliar pares semanticamente próximos com semanticTag=argue"
            >
              {detectingContradictions
                ? 'A analisar…'
                : contradictions.length > 0
                  ? `Contradições: ${contradictions.length}`
                  : 'Detectar contradições'}
            </button>
          )}
        </div>
      </div>

      {filteredData !== null && filteredData.nodes.length > 0 && (
        <div className={cn(styles.legend)}>
          {bookIds
            .filter((bid) =>
              filteredData.nodes.some((n) => n.bookId === bid),
            )
            .map((bid) => {
              const book = allBooks.find((b) => b.id === bid);
              return (
                <span key={bid} className={cn(styles.legendItem)}>
                  <span
                    className={cn(styles.legendDot)}
                    style={{ background: bookColor(bid, bookIds) }}
                  />
                  {book?.title.slice(0, 25) ?? bid.slice(0, 8)}
                </span>
              );
            })}
        </div>
      )}

      <div className={cn(styles.canvasWrap)}>
        <svg ref={svgRef} className={cn(styles.canvas)} />
        {selectedNode !== null && (
          <div className={cn(styles.sidebar)}>
            <button
              type="button"
              className={cn(styles.sidebarClose)}
              onClick={() => setSelectedNode(null)}
            >
              ×
            </button>
            <h3 className={cn(styles.sidebarTitle)}>
              {selectedNode.node.bookTitle}
            </h3>
            <p className={cn(styles.sidebarBook)}>
              {selectedNode.highlight.color} · {new Date(selectedNode.highlight.createdAt).toLocaleDateString('pt-PT')}
            </p>
            <p className={cn(styles.sidebarText)}>
              "{selectedNode.highlight.text}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Graph;
