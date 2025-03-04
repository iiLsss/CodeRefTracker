import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData } from '../../types';

// 网络图属性
interface NetworkGraphProps {
  data: GraphData;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string) => void;
}

// 网络图组件
const NetworkGraph: React.FC<NetworkGraphProps> = ({ data, selectedNode, onNodeSelect }) => {
  // 引用 SVG 元素
  const svgRef = useRef<SVGSVGElement>(null);
  
  // 渲染图表
  useEffect(() => {
    if (!svgRef.current || !data || data.nodes.length === 0) {
      return;
    }
    
    // 清除现有内容
    d3.select(svgRef.current).selectAll('*').remove();
    
    // 获取容器尺寸
    const container = svgRef.current.parentElement;
    if (!container) {return;}
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // 创建 SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);
    
    // 创建缩放行为
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    svg.call(zoom as any);
    
    // 创建主容器
    const g = svg.append('g');
    
    // 创建力导向模拟
    const simulation = d3.forceSimulation(data.nodes as any)
      .force('link', d3.forceLink(data.links as any)
        .id((d: any) => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1));
    
    // 创建连接线
    const link = g.append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke-width', 1);
    
    // 创建节点
    const node = g.append('g')
      .selectAll('circle')
      .data(data.nodes)
      .join('circle')
      .attr('r', (d) => Math.max(5, Math.min(10, 5 + Math.sqrt(d.incomingCount + d.outgoingCount))))
      .attr('fill', (d) => {
        if (d.id === selectedNode) {
          return '#ff6b6b'; // 选中节点
        } else if (d.incomingCount > 5 || d.outgoingCount > 5) {
          return '#ffa94d'; // 热点文件
        } else if (d.incomingCount === 0 && d.outgoingCount === 0) {
          return '#868e96'; // 孤立文件
        } else if (d.incomingCount === 0) {
          return '#4dabf7'; // 只有传出引用
        } else if (d.outgoingCount === 0) {
          return '#38d9a9'; // 只有传入引用
        }
        return '#74c0fc'; // 默认
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .on('click', (event, d) => {
        onNodeSelect(d.id);
      })
      .call(drag(simulation) as any);
    
    // 添加节点标签
    const label = g.append('g')
      .selectAll('text')
      .data(data.nodes)
      .join('text')
      .attr('dx', 12)
      .attr('dy', '.35em')
      .text((d) => d.name)
      .style('font-size', '10px')
      .style('fill', '#333')
      .style('pointer-events', 'none')
      .style('opacity', (d) => {
        // 只显示选中节点和重要节点的标签
        if (d.id === selectedNode) {return 1;}
        if (d.incomingCount > 5 || d.outgoingCount > 5) {return 0.8;}
        return 0;
      });
    
    // 添加悬停提示
    node.append('title')
      .text((d) => `${d.name}\nIncoming: ${d.incomingCount}\nOutgoing: ${d.outgoingCount}`);
    
    // 更新模拟
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      
      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);
      
      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });
    
    // 拖拽行为
    function drag(simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>) {
      function dragstarted(event: any) {
        if (!event.active) {simulation.alphaTarget(0.3).restart();}
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event: any) {
        if (!event.active) {simulation.alphaTarget(0);}
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }
    
    // 清理函数
    return () => {
      simulation.stop();
    };
  }, [data, selectedNode, onNodeSelect]);
  
  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
};

export default NetworkGraph; 
