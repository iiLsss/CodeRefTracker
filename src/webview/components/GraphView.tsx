import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphData, FileNode, FileEdge } from '../../types';
import { ViewLayout } from '../App';
import { buildDirColorMap, getDirColor, nodeRadius } from '../utils/colors';

interface SimNode extends d3.SimulationNodeDatum, FileNode {
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode;
  target: SimNode;
}

interface Props {
  data: GraphData | null;
  allData: GraphData | null;
  selectedNode: string | null;
  onNodeSelect: (id: string | null) => void;
  onOpenFile: (path: string) => void;
  layout: ViewLayout;
  expandLevel: number;
}

export default function GraphView({
  data, allData, selectedNode, onNodeSelect, onOpenFile, layout, expandLevel,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const buildGraph = useCallback(() => {
    if (!data || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    d3.select(container).select('svg').remove();

    const directories = [...new Set(data.nodes.map(n => n.directory))];
    buildDirColorMap(directories);

    const circularEdges = new Set<string>();
    if (allData) {
      for (const cycle of allData.circularDeps) {
        for (let i = 0; i < cycle.length; i++) {
          const s = cycle[i];
          const t = cycle[(i + 1) % cycle.length];
          circularEdges.add(`${s}->${t}`);
        }
      }
    }

    const nodes: SimNode[] = data.nodes.map(n => ({ ...n, x: 0, y: 0 }));
    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const links: SimLink[] = data.edges
      .filter(e => nodeById.has(e.source) && nodeById.has(e.target))
      .map(e => ({
        source: nodeById.get(e.source)!,
        target: nodeById.get(e.target)!,
      }));

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', 'transparent');

    svgRef.current = svg.node();

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 6])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    svg.on('click', (event) => {
      if (event.target === svg.node()) onNodeSelect(null);
    });
    zoomRef.current = zoom;

    const g = svg.append('g');

    g.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-5 -5 10 10')
      .attr('refX', 12)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M-4,-3 L4,0 L-4,3 Z')
      .attr('fill', 'var(--graph-edge)');

    const linkGroup = g.append('g');
    const nodeGroup = g.append('g');

    const link = linkGroup.selectAll<SVGLineElement, SimLink>('line')
      .data(links)
      .join('line')
      .attr('class', d => {
        const key = `${d.source.id}->${d.target.id}`;
        return `graph-edge${circularEdges.has(key) ? ' circular' : ''}`;
      })
      .attr('marker-end', 'url(#arrowhead)');

    const node = nodeGroup.selectAll<SVGGElement, SimNode>('g')
      .data(nodes, d => d.id)
      .join('g')
      .attr('class', d => `graph-node${d.isOrphan ? ' orphan' : ''}`);

    node.append('circle')
      .attr('r', d => nodeRadius(d.importedBy.length))
      .attr('fill', d => getDirColor(d.directory))
      .attr('fill-opacity', 0.85)
      .attr('stroke', d => getDirColor(d.directory))
      .attr('stroke-width', 1.5);

    node.append('text')
      .attr('dy', d => nodeRadius(d.importedBy.length) + 12)
      .attr('text-anchor', 'middle')
      .text(d => d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name);

    node.append('title')
      .text(d => `${d.path}\n↑ imported by: ${d.importedBy.length}\n↓ imports: ${d.imports.length}`);

    const drag = d3.drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    node.call(drag);

    node.on('click', (event, d) => {
      event.stopPropagation();
      onNodeSelect(d.id === selectedNode ? null : d.id);
    });

    node.on('dblclick', (event, d) => {
      event.stopPropagation();
      event.preventDefault();
      onOpenFile(d.path);
    });

    node.on('contextmenu', (event, d) => {
      event.preventDefault();
      onOpenFile(d.path);
    });

    const simulation = d3.forceSimulation<SimNode>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links)
        .id(d => d.id)
        .distance(80))
      .force('charge', d3.forceManyBody<SimNode>().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimNode>().radius(d => nodeRadius(d.importedBy.length) + 5))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    simulationRef.current = simulation;

    if (nodes.length > 0) {
      simulation.on('end', () => {
        const xs = nodes.map(n => n.x);
        const ys = nodes.map(n => n.y);
        const xMin = Math.min(...xs) - 50;
        const xMax = Math.max(...xs) + 50;
        const yMin = Math.min(...ys) - 50;
        const yMax = Math.max(...ys) + 50;
        const gw = xMax - xMin;
        const gh = yMax - yMin;
        const scale = Math.min(width / gw, height / gh, 1.5) * 0.9;
        const tx = (width - gw * scale) / 2 - xMin * scale;
        const ty = (height - gh * scale) / 2 - yMin * scale;
        svg.transition().duration(500).call(
          zoom.transform,
          d3.zoomIdentity.translate(tx, ty).scale(scale),
        );
      });
    }
  }, [data, allData, layout, onNodeSelect, onOpenFile, selectedNode]);

  useEffect(() => {
    buildGraph();
    return () => {
      simulationRef.current?.stop();
    };
  }, [buildGraph]);

  useEffect(() => {
    if (!svgRef.current || !data) return;
    const svg = d3.select(svgRef.current);

    if (selectedNode && allData) {
      const connected = getConnectedNodes(selectedNode, allData, expandLevel);
      const importSet = new Set(allData.nodes.find(n => n.id === selectedNode)?.imports ?? []);
      const importedBySet = new Set(allData.nodes.find(n => n.id === selectedNode)?.importedBy ?? []);

      svg.selectAll<SVGGElement, SimNode>('.graph-node')
        .classed('dimmed', d => !connected.has(d.id))
        .classed('selected', d => d.id === selectedNode);

      svg.selectAll<SVGLineElement, SimLink>('.graph-edge')
        .classed('dimmed', d => !connected.has(d.source.id) || !connected.has(d.target.id))
        .classed('highlighted-import', d => d.source.id === selectedNode && importSet.has(d.target.id))
        .classed('highlighted-importedby', d => d.target.id === selectedNode && importedBySet.has(d.source.id));
    } else {
      svg.selectAll('.graph-node')
        .classed('dimmed', false)
        .classed('selected', false);
      svg.selectAll('.graph-edge')
        .classed('dimmed', false)
        .classed('highlighted-import', false)
        .classed('highlighted-importedby', false);
    }
  }, [selectedNode, data, allData, expandLevel]);

  useEffect(() => {
    const handleResize = () => buildGraph();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [buildGraph]);

  return <div ref={containerRef} className="flex-1 relative min-w-0" />;
}

function getConnectedNodes(
  rootId: string, data: GraphData, maxLevel: number,
): Set<string> {
  const result = new Set<string>([rootId]);
  const nodeMap = new Map(data.nodes.map(n => [n.id, n]));

  let frontier = [rootId];
  for (let level = 0; level < maxLevel; level++) {
    const next: string[] = [];
    for (const id of frontier) {
      const node = nodeMap.get(id);
      if (!node) continue;
      for (const dep of [...node.imports, ...node.importedBy]) {
        if (!result.has(dep)) {
          result.add(dep);
          next.push(dep);
        }
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return result;
}
