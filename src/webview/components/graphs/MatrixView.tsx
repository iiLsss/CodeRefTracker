import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData } from '../../types';

interface MatrixViewProps {
  data: GraphData;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string) => void;
}

const MatrixView: React.FC<MatrixViewProps> = ({ data, selectedNode, onNodeSelect }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!data || !svgRef.current) {return;}
    
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const padding = 100; // 为标签留出空间
    
    // 清除之前的图形
    svg.selectAll("*").remove();
    
    // 创建缩放行为
    const zoom = d3.zoom()
      .scaleExtent([0.5, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom as any);
    
    // 创建主容器
    const g = svg.append("g")
      .attr("transform", `translate(${padding}, ${padding})`);
    
    // 重置缩放
    svg.call(zoom.transform as any, d3.zoomIdentity.translate(padding, padding));
    
    // 准备数据
    const nodes = data.nodes;
    const n = nodes.length;
    
    // 创建邻接矩阵
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    
    // 节点索引映射
    const nodeIndex = new Map<string, number>();
    nodes.forEach((node, i) => {
      nodeIndex.set(node.id, i);
    });
    
    // 填充矩阵
    data.links.forEach(link => {
      const sourceIndex = nodeIndex.get(link.source);
      const targetIndex = nodeIndex.get(link.target);
      if (sourceIndex !== undefined && targetIndex !== undefined) {
        matrix[sourceIndex][targetIndex] = link.weight || 1;
      }
    });
    
    // 计算矩阵尺寸
    const size = Math.min(width, height) - 2 * padding;
    const cellSize = size / n;
    
    // 颜色比例尺
    const color = d3.scaleLinear<string>()
      .domain([0, d3.max(matrix.flat()) || 1])
      .range(["#f7fbff", "#08519c"]);
    
    // 绘制单元格
    const cells = g.selectAll(".cell")
      .data(matrix.flatMap((row, i) => 
        row.map((value, j) => ({ row: i, col: j, value }))
      ))
      .enter()
      .append("rect")
      .attr("class", "cell")
      .attr("x", d => d.col * cellSize)
      .attr("y", d => d.row * cellSize)
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("fill", d => d.value > 0 ? color(d.value) : "#f5f5f5")
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .on("click", (event, d: any) => {
        const nodeId = nodes[d.row].id;
        onNodeSelect(nodeId);
      })
      .on("mouseover", (event, d: any) => {
        // 高亮行和列
        cells
          .attr("opacity", (cell: any) => 
            cell.row === d.row || cell.col === d.col ? 1 : 0.3
          );
        
        // 显示工具提示
        const sourceNode = nodes[d.row];
        const targetNode = nodes[d.col];
        
        tooltip
          .style("opacity", 1)
          .html(`
            <div class="p-2">
              <div><strong>From:</strong> ${sourceNode.name}</div>
              <div><strong>To:</strong> ${targetNode.name}</div>
              <div><strong>References:</strong> ${d.value}</div>
            </div>
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        cells.attr("opacity", 1);
        tooltip.style("opacity", 0);
      });
    
    // 添加行标签
    g.selectAll(".row-label")
      .data(nodes)
      .enter()
      .append("text")
      .attr("class", "row-label")
      .attr("x", -5)
      .attr("y", (d, i) => i * cellSize + cellSize / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 10)
      .text(d => d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name)
      .on("click", (event, d) => {
        onNodeSelect(d.id);
      });
    
    // 添加列标签
    g.selectAll(".col-label")
      .data(nodes)
      .enter()
      .append("text")
      .attr("class", "col-label")
      .attr("x", (d, i) => i * cellSize + cellSize / 2)
      .attr("y", -5)
      .attr("text-anchor", "start")
      .attr("dominant-baseline", "middle")
      .attr("transform", (d, i) => `rotate(-45, ${i * cellSize + cellSize / 2}, -5)`)
      .attr("font-size", 10)
      .text(d => d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name)
      .on("click", (event, d) => {
        onNodeSelect(d.id);
      });
    
    // 高亮选中的节点
    if (selectedNode) {
      const index = nodeIndex.get(selectedNode);
      if (index !== undefined) {
        // 高亮行和列
        cells
          .attr("stroke", (d: any) => 
            d.row === index || d.col === index ? "#ff6b6b" : "#fff"
          )
          .attr("stroke-width", (d: any) => 
            d.row === index || d.col === index ? 2 : 0.5
          );
      }
    }
    
    // 添加工具提示
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "5px")
      .style("pointer-events", "none")
      .style("font-size", "12px")
      .style("z-index", 1000);
    
    return () => {
      tooltip.remove();
    };
  }, [data, selectedNode, onNodeSelect]);
  
  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

export default MatrixView; 
