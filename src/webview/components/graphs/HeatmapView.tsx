import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData } from '../../types';

interface HeatmapViewProps {
  data: GraphData;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string) => void;
}

const HeatmapView: React.FC<HeatmapViewProps> = ({ data, selectedNode, onNodeSelect }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!data || !svgRef.current) {return;}
    
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    
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
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // 重置缩放
    svg.call(zoom.transform as any, d3.zoomIdentity.translate(margin.left, margin.top));
    
    // 准备数据
    const nodes = data.nodes;
    
    // 按引用数量排序
    nodes.sort((a, b) => (b.incomingCount + b.outgoingCount) - (a.incomingCount + a.outgoingCount));
    
    // 计算热图尺寸
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // 计算单元格尺寸
    const cellWidth = chartWidth / nodes.length;
    const cellHeight = 40;
    
    // 颜色比例尺
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, d3.max(nodes, d => d.incomingCount + d.outgoingCount) || 1]);
    
    // 创建 X 轴比例尺
    const xScale = d3.scaleBand()
      .domain(nodes.map(d => d.id))
      .range([0, chartWidth])
      .padding(0.1);
    
    // 绘制热图单元格
    const cells = g.selectAll(".cell")
      .data(nodes)
      .enter()
      .append("rect")
      .attr("class", "cell")
      .attr("x", d => xScale(d.id) || 0)
      .attr("y", 0)
      .attr("width", xScale.bandwidth())
      .attr("height", cellHeight)
      .attr("fill", d => colorScale(d.incomingCount + d.outgoingCount))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .attr("rx", 2)
      .attr("ry", 2)
      .on("click", (event, d) => {
        onNodeSelect(d.id);
      })
      .on("mouseover", (event, d) => {
        // 高亮单元格
        d3.select(event.currentTarget)
          .attr("stroke", "#333")
          .attr("stroke-width", 2);
        
        // 显示工具提示
        tooltip
          .style("opacity", 1)
          .html(`
            <div class="p-2">
              <div><strong>File:</strong> ${d.name}</div>
              <div><strong>Path:</strong> ${d.fullPath}</div>
              <div><strong>Total References:</strong> ${d.incomingCount + d.outgoingCount}</div>
              <div><strong>Incoming:</strong> ${d.incomingCount}</div>
              <div><strong>Outgoing:</strong> ${d.outgoingCount}</div>
            </div>
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget)
          .attr("stroke", "#fff")
          .attr("stroke-width", function() {
            const d = d3.select(this).datum() as any;
            return d.id === selectedNode ? 2 : 1;
          });
        
        tooltip.style("opacity", 0);
      });
    
    // 添加标签
    g.selectAll(".label")
      .data(nodes)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", d => (xScale(d.id) || 0) + xScale.bandwidth() / 2)
      .attr("y", cellHeight + 15)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("transform", d => `rotate(45, ${(xScale(d.id) || 0) + xScale.bandwidth() / 2}, ${cellHeight + 15})`)
      .text(d => d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name);
    
    // 添加引用数量标签
    g.selectAll(".ref-count")
      .data(nodes)
      .enter()
      .append("text")
      .attr("class", "ref-count")
      .attr("x", d => (xScale(d.id) || 0) + xScale.bandwidth() / 2)
      .attr("y", cellHeight / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 10)
      .attr("fill", d => d3.hsl(colorScale(d.incomingCount + d.outgoingCount)).l > 0.5 ? "#333" : "#fff")
      .text(d => d.incomingCount + d.outgoingCount);
    
    // 添加图例
    const legendWidth = 200;
    const legendHeight = 20;
    
    const legendX = chartWidth - legendWidth;
    const legendY = -40;
    
    const legendScale = d3.scaleLinear()
      .domain([0, d3.max(nodes, d => d.incomingCount + d.outgoingCount) || 1])
      .range([0, legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickSize(6);
    
    const defs = svg.append("defs");
    
    const linearGradient = defs.append("linearGradient")
      .attr("id", "linear-gradient");
    
    linearGradient.selectAll("stop")
      .data([
        { offset: "0%", color: colorScale(0) },
        { offset: "100%", color: colorScale(d3.max(nodes, d => d.incomingCount + d.outgoingCount) || 1) }
      ])
      .enter()
      .append("stop")
      .attr("offset", d => d.offset)
      .attr("stop-color", d => d.color);
    
    g.append("g")
      .attr("transform", `translate(${legendX}, ${legendY})`)
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#linear-gradient)");
    
    g.append("g")
      .attr("transform", `translate(${legendX}, ${legendY + legendHeight})`)
      .call(legendAxis)
      .append("text")
      .attr("x", legendWidth / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("fill", "#333")
      .attr("font-size", 12)
      .text("References");
    
    // 高亮选中的节点
    if (selectedNode) {
      cells.filter(d => d.id === selectedNode)
        .attr("stroke", "#ff6b6b")
        .attr("stroke-width", 3);
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

export default HeatmapView; 
