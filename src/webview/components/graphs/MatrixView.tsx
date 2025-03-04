import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData } from '../../types';

// 矩阵视图属性
interface MatrixViewProps {
  data: GraphData;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string) => void;
}

// 矩阵视图组件
const MatrixView: React.FC<MatrixViewProps> = ({ data, selectedNode, onNodeSelect }) => {
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
    const g = svg.append('g')
      .attr('transform', `translate(50, 50)`);
    
    // 限制节点数量，避免矩阵过大
    const maxNodes = 50;
    let nodes = [...data.nodes];
    
    // 如果有选中节点，确保它在列表中
    if (selectedNode) {
      const selectedNodeIndex = nodes.findIndex(n => n.id === selectedNode);
      if (selectedNodeIndex !== -1) {
        // 将选中节点移到前面
        const selectedNodeData = nodes[selectedNodeIndex];
        nodes.splice(selectedNodeIndex, 1);
        nodes.unshift(selectedNodeData);
      }
    }
    
    // 按引用数量排序并限制数量
    nodes = nodes
      .sort((a, b) => (b.incomingCount + b.outgoingCount) - (a.incomingCount + a.outgoingCount))
      .slice(0, maxNodes);
    
    // 创建邻接矩阵
    const matrix: number[][] = [];
    const nodeIds = nodes.map(n => n.id);
    
    // 初始化矩阵
    for (let i = 0; i < nodes.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < nodes.length; j++) {
        matrix[i][j] = 0;
      }
    }
    
    // 填充矩阵
    data.links.forEach(link => {
      const sourceIndex = nodeIds.indexOf(link.source);
      const targetIndex = nodeIds.indexOf(link.target);
      
      if (sourceIndex !== -1 && targetIndex !== -1) {
        matrix[sourceIndex][targetIndex] = 1;
      }
    });
    
    // 计算单元格大小
    const cellSize = Math.min(
      (width - 100) / nodes.length,
      (height - 100) / nodes.length
    );
    
    // 创建颜色比例尺
    const color = d3.scaleSequential()
      .interpolator(d3.interpolateBlues)
      .domain([0, 1]);
    
    // 创建矩阵单元格
    g.selectAll('rect')
      .data(nodes.flatMap((source, i) => 
        nodes.map((target, j) => ({
          sourceId: source.id,
          targetId: target.id,
          sourceName: source.name,
          targetName: target.name,
          x: j,
          y: i,
          value: matrix[i][j]
        }))
      ))
      .join('rect')
      .attr('x', d => d.x * cellSize)
      .attr('y', d => d.y * cellSize)
      .attr('width', cellSize - 1)
      .attr('height', cellSize - 1)
      .attr('fill', (d: { sourceId: string; targetId: string; sourceName: string; targetName: string; x: number; y: number; value: number; }) => {
        if (d.sourceId === selectedNode || d.targetId === selectedNode) {
          return '#ff7f0e'; // 高亮选中节点的连接
        }
        return d.value ? color(d.value) as string : color(0) as string;
      })
      .attr('stroke', d => 
        (d.sourceId === selectedNode || d.targetId === selectedNode) ? '#fa5252' : '#dee2e6'
      )
      .on('click', (event, d) => {
        // 点击单元格时选择源节点
        onNodeSelect(d.sourceId);
      })
      .append('title')
      .text(d => `${d.sourceName} → ${d.targetName}: ${d.value ? 'Referenced' : 'Not Referenced'}`);
    
    // 添加行标签
    g.selectAll('.row-label')
      .data(nodes)
      .join('text')
      .attr('class', 'row-label')
      .attr('x', -5)
      .attr('y', (d, i) => i * cellSize + cellSize / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px')
      .text(d => d.name)
      .style('font-weight', d => d.id === selectedNode ? 'bold' : 'normal')
      .style('fill', d => d.id === selectedNode ? '#fa5252' : '#495057')
      .on('click', (event, d) => {
        onNodeSelect(d.id);
      });
    
    // 添加列标签
    g.selectAll('.column-label')
      .data(nodes)
      .join('text')
      .attr('class', 'column-label')
      .attr('x', (d, i) => i * cellSize + cellSize / 2)
      .attr('y', -5)
      .attr('text-anchor', 'start')
      .attr('transform', (d, i) => `rotate(-45, ${i * cellSize + cellSize / 2}, -5)`)
      .attr('font-size', '10px')
      .text(d => d.name)
      .style('font-weight', d => d.id === selectedNode ? 'bold' : 'normal')
      .style('fill', d => d.id === selectedNode ? '#fa5252' : '#495057')
      .on('click', (event, d) => {
        onNodeSelect(d.id);
      });
    
    // 添加图例
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 120}, 20)`);
    
    legend.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', color(0) as string);
    
    legend.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .attr('font-size', '12px')
      .text('No Reference');
    
    legend.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('y', 20)
      .attr('fill', color(1));
    
    legend.append('text')
      .attr('x', 20)
      .attr('y', 32)
      .attr('font-size', '12px')
      .text('Has Reference');
    
    // 添加标题
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text('Dependency Matrix');
  }, [data, selectedNode, onNodeSelect]);
  
  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
};

export default MatrixView; 
