import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
// @ts-ignore
import dagre from 'cytoscape-dagre';
import { GraphData } from '../../types';

cytoscape.use(dagre);

interface FlowGraphProps {
  data: GraphData;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string) => void;
}

const FlowGraph: React.FC<FlowGraphProps> = ({ data, selectedNode, onNodeSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    // Transform data for Cytoscape
    const elements = [
      ...data.nodes.map(node => ({
        data: { 
          id: node.id, 
          label: node.name,
          incomingCount: node.incomingCount,
          outgoingCount: node.outgoingCount
        }
      })),
      ...data.links.map(link => ({
        data: { 
          source: link.source, 
          target: link.target 
        }
      }))
    ];

    // Initialize Cytoscape
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elements,
      layout: {
        name: 'dagre',
        // @ts-ignore
        rankDir: 'LR', // Left to Right
        nodeSep: 50,
        rankSep: 100,
        animate: true,
        animationDuration: 500
      },
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'background-color': '#74c0fc',
            'width': (ele: any) => Math.max(20, 10 + Math.sqrt(ele.data('incomingCount') + ele.data('outgoingCount')) * 5),
            'height': (ele: any) => Math.max(20, 10 + Math.sqrt(ele.data('incomingCount') + ele.data('outgoingCount')) * 5),
            'font-size': '10px'
          }
        },
        {
          selector: ':selected',
          style: {
            'background-color': '#ff6b6b',
            'border-width': 2,
            'border-color': '#333'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 1,
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
          }
        }
      ]
    });

    // Event listeners
    cyRef.current.on('tap', 'node', (evt) => {
      const node = evt.target;
      onNodeSelect(node.id());
    });

    // Clean up
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [data]);

  // Handle selection change
  useEffect(() => {
    if (!cyRef.current) return;
    
    cyRef.current.elements().removeClass('selected');
    
    if (selectedNode) {
      const node = cyRef.current.getElementById(selectedNode);
      if (node.length > 0) {
        node.addClass('selected');
        // Center on selected node
        cyRef.current.animate({
          center: { eles: node },
          zoom: 1.5
        }, { duration: 500 });
      }
    }
  }, [selectedNode]);

  return (
    <div className="w-full h-full bg-white" ref={containerRef} />
  );
};

export default FlowGraph;
