import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData } from '../../types';

// 树形图属性
interface TreeGraphProps {
  data: GraphData;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string) => void;
}

// 树节点类型
interface TreeNode {
  id: string;
  name: string;
  value?: number;
  children?: TreeNode[];
}

// 树形图组件
const TreeGraph: React.FC<TreeGraphProps> = ({ data, selectedNode, onNodeSelect }) => {
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
      .attr('transform', `translate(${width / 2}, ${height / 2})`);
    
    // 构建树形数据
    const treeData = buildTreeData();
    
    // 创建树形布局
    const treeLayout = d3.tree<TreeNode>()
      .size([2 * Math.PI, Math.min(width, height) / 2 - 100])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);
    
    // 计算节点位置
    const root = d3.hierarchy(treeData);
    treeLayout(root);
    
    // 创建连接线
    const link = g.append('g')
      .attr('fill', 'none')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1.5)
      .selectAll('path')
      .data(root.links())
      .join('path')
      .attr('d', (d: any) => {
        const linkGenerator = d3.linkRadial<any, any>()
          .angle((d: any) => d.x)
          .radius((d: any) => d.y);
        return linkGenerator(d);
      });
    
    // 创建节点
    const node = g.append('g')
      .selectAll('circle')
      .data(root.descendants())
      .join('circle')
      .attr('transform', (d: any) => `
        translate(${radialPoint(d.x, d.y)})
      `)
      .attr('r', (d) => {
        const nodeData = data.nodes.find(n => n.id === d.data.id);
        if (!nodeData) {return 4;}
        return Math.max(4, Math.min(8, 4 + Math.sqrt(nodeData.incomingCount + nodeData.outgoingCount)));
      })
      .attr('fill', (d) => {
        if (d.data.id === selectedNode) {
          return '#ff6b6b'; // 选中节点
        }
        
        const nodeData = data.nodes.find(n => n.id === d.data.id);
        if (!nodeData) {return '#74c0fc';}
        
        if (nodeData.incomingCount > 5 || nodeData.outgoingCount > 5) {
          return '#ffa94d'; // 热点文件
        } else if (nodeData.incomingCount === 0 && nodeData.outgoingCount === 0) {
          return '#868e96'; // 孤立文件
        } else if (nodeData.incomingCount === 0) {
          return '#4dabf7'; // 只有传出引用
        } else if (nodeData.outgoingCount === 0) {
          return '#38d9a9'; // 只有传入引用
        }
        return '#74c0fc'; // 默认
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .on('click', (event, d) => {
        onNodeSelect(d.data.id);
      });
    
    // 添加节点标签
    const label = g.append('g')
      .selectAll('text')
      .data(root.descendants())
      .join('text')
      .attr('transform', (d: any) => {
        const [x, y] = radialPoint(d.x, d.y);
        return `translate(${x},${y + 15})`;
      })
      .attr('text-anchor', 'middle')
      .text((d) => d.data.name)
      .style('font-size', '10px')
      .style('fill', '#333')
      .style('pointer-events', 'none')
      .style('opacity', (d) => {
        if (d.data.id === selectedNode) {return 1;}
        if (d.depth < 2) {return 0.8;}
        return 0;
      });
    
    // 添加悬停提示
    node.append('title')
      .text((d) => {
        const nodeData = data.nodes.find(n => n.id === d.data.id);
        if (!nodeData) {return d.data.name;}
        return `${d.data.name}\nIncoming: ${nodeData.incomingCount}\nOutgoing: ${nodeData.outgoingCount}`;
      });
    
    // 辅助函数：将极坐标转换为笛卡尔坐标
    function radialPoint(x: number, y: number): [number, number] {
      return [y * Math.cos(x), y * Math.sin(x)];
    }
    
    // 构建树形数据
    function buildTreeData(): TreeNode {
      // 找到根节点（入度为0或入度最小的节点）
      let rootNode = data.nodes[0];
      
      if (selectedNode) {
        // 如果有选中节点，以选中节点为根
        const selected = data.nodes.find(n => n.id === selectedNode);
        if (selected) {
          rootNode = selected;
        }
      } else {
        // 否则找入度最小的节点
        rootNode = data.nodes.reduce((min, node) => {
          return node.incomingCount < min.incomingCount ? node : min;
        }, data.nodes[0]);
      }
      
      // 构建树
      const buildNode = (nodeId: string, depth: number = 0, visited: Set<string> = new Set()): TreeNode | null => {
        if (depth > 3 || visited.has(nodeId)) {
          return null;
        }
        
        visited.add(nodeId);
        
        const node = data.nodes.find(n => n.id === nodeId);
        if (!node) {return null;}
        
        const children: TreeNode[] = [];
        
        // 添加传出引用作为子节点
        data.links
          .filter(link => link.source === nodeId)
          .forEach(link => {
            const childNode = buildNode(link.target, depth + 1, new Set(visited));
            if (childNode) {
              children.push(childNode);
            }
          });
        
        return {
          id: node.id,
          name: node.name,
          value: node.incomingCount + node.outgoingCount,
          children: children.length > 0 ? children : undefined
        };
      };
      
      return buildNode(rootNode.id) || { id: 'root', name: 'No Data' };
    }
  }, [data, selectedNode, onNodeSelect]);
  
  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
};

export default TreeGraph; 
