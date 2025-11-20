import React, { useEffect, useRef, useCallback } from 'react';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import { GraphData } from '../../types';

interface OptimizedTreeGraphProps {
  data: GraphData;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string) => void;
}

const OptimizedTreeGraph: React.FC<OptimizedTreeGraphProps> = ({ 
  data, 
  selectedNode, 
  onNodeSelect 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  // 获取节点颜色
  const getNodeColor = useCallback((node: any) => {
    if (node.id === selectedNode) {
      return '#ff6b6b'; // 选中节点
    } else if (node.incomingCount > 5 || node.outgoingCount > 5) {
      return '#ffa94d'; // 热点文件
    } else if (node.incomingCount === 0 && node.outgoingCount === 0) {
      return '#868e96'; // 孤立文件
    } else if (node.incomingCount === 0) {
      return '#4dabf7'; // 只有传出引用
    } else if (node.outgoingCount === 0) {
      return '#38d9a9'; // 只有传入引用
    }
    return '#74c0fc'; // 默认
  }, [selectedNode]);

  // 获取节点大小
  const getNodeSize = useCallback((node: any) => {
    const totalRefs = node.incomingCount + node.outgoingCount;
    return Math.max(20, Math.min(60, 20 + totalRefs * 3));
  }, []);

  // 构建树形数据
  const buildTreeData = useCallback(() => {
    if (!data || data.nodes.length === 0) {return { nodes: [], edges: [] };}

    // 找到根节点
    let rootNode = data.nodes[0];
    if (selectedNode) {
      const selected = data.nodes.find(n => n.id === selectedNode);
      if (selected) {
        rootNode = selected;
      }
    } else {
      // 找入度最小的节点作为根节点
      rootNode = data.nodes.reduce((min, node) => {
        return node.incomingCount < min.incomingCount ? node : min;
      }, data.nodes[0]);
    }

    // 构建树结构
    const visited = new Set<string>();
    const treeNodes: ElementDefinition[] = [];
    const treeEdges: ElementDefinition[] = [];

    const addNodeToTree = (nodeId: string, depth: number = 0) => {
      if (depth > 4 || visited.has(nodeId)) {return;}
      
      visited.add(nodeId);
      const node = data.nodes.find(n => n.id === nodeId);
      if (!node) {return;}

      // 添加节点
      treeNodes.push({
        data: {
          id: node.id,
          label: node.name,
          fullPath: node.fullPath,
          incomingCount: node.incomingCount,
          outgoingCount: node.outgoingCount,
          depth: depth
        }
      });

      // 添加子节点
      data.links
        .filter(link => link.source === nodeId)
        .slice(0, 5) // 限制子节点数量
        .forEach(link => {
          if (!visited.has(link.target)) {
            treeEdges.push({
              data: {
                id: `${link.source}-${link.target}`,
                source: link.source,
                target: link.target
              }
            });
            addNodeToTree(link.target, depth + 1);
          }
        });
    };

    addNodeToTree(rootNode.id);

    return { nodes: treeNodes, edges: treeEdges };
  }, [data, selectedNode]);

  // 初始化Cytoscape
  useEffect(() => {
    if (!containerRef.current) {return;}

    const { nodes, edges } = buildTreeData();
    if (nodes.length === 0) {return;}

    // 创建Cytoscape实例
    const cy = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: any) => {
              const node = data.nodes.find(n => n.id === ele.id());
              return node ? getNodeColor(node) : '#74c0fc';
            },
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#333',
            'font-size': '12px',
            'font-weight': 'bold',
            'width': (ele: any) => {
              const node = data.nodes.find(n => n.id === ele.id());
              return node ? getNodeSize(node) : 30;
            },
            'height': (ele: any) => {
              const node = data.nodes.find(n => n.id === ele.id());
              return node ? getNodeSize(node) : 30;
            },
            'border-width': 2,
            'border-color': '#fff',
            'text-outline-width': 2,
            'text-outline-color': '#fff'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#ff6b6b',
            'border-width': 4
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#999',
            'target-arrow-color': '#999',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.2
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#ff6b6b',
            'target-arrow-color': '#ff6b6b',
            'width': 3
          }
        },
        {
          selector: '.highlighted',
          style: {
            'opacity': 1,
            'z-index': 999
          }
        },
        {
          selector: 'node:not(.highlighted)',
          style: {
            'opacity': 0.3
          }
        },
        {
          selector: 'edge:not(.highlighted)',
          style: {
            'opacity': 0.3
          }
        }
      ],
      layout: {
        name: 'breadthfirst',
        directed: true,
        roots: nodes.length > 0 && nodes[0].data.id ? [nodes[0].data.id] : undefined,
        padding: 50,
        spacingFactor: 1.5,
        animate: true,
        animationDuration: 500
      }
    });

    cyRef.current = cy;

    // 事件监听
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      onNodeSelect(node.id());
    });

    // 悬停效果
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      const connectedEdges = node.connectedEdges();
      const connectedNodes = connectedEdges.connectedNodes();
      
      // 高亮连接的节点和边
      cy.elements().removeClass('highlighted');
      node.addClass('highlighted');
      connectedNodes.addClass('highlighted');
      connectedEdges.addClass('highlighted');
    });

    cy.on('mouseout', 'node', () => {
      cy.elements().removeClass('highlighted');
    });

    // 清理函数
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [data, selectedNode, onNodeSelect, buildTreeData, getNodeColor, getNodeSize]);

  // 更新选中节点样式
  useEffect(() => {
    if (cyRef.current && selectedNode) {
      cyRef.current.nodes().unselect();
      const selectedNodeEle = cyRef.current.getElementById(selectedNode);
      if (selectedNodeEle.length > 0) {
        selectedNodeEle.select();
      }
    }
  }, [selectedNode]);

  // 控制函数
  const fitView = () => {
    cyRef.current?.fit();
  };

  const resetLayout = () => {
    if (cyRef.current) {
      const layout = cyRef.current.layout({
        name: 'breadthfirst',
        directed: true,
        padding: 50,
        spacingFactor: 1.5,
        animate: true,
        animationDuration: 500
      });
      layout.run();
    }
  };

  const changeLayout = (layoutName: string) => {
    if (cyRef.current) {
      let layoutOptions: any = {
        name: layoutName,
        animate: true,
        animationDuration: 500
      };

      switch (layoutName) {
        case 'breadthfirst':
          layoutOptions = {
            ...layoutOptions,
            directed: true,
            padding: 50,
            spacingFactor: 1.5
          };
          break;
        case 'circle':
          layoutOptions = {
            ...layoutOptions,
            radius: 200,
            padding: 50
          };
          break;
        case 'concentric':
          layoutOptions = {
            ...layoutOptions,
            concentric: (node: any) => node.degree(),
            levelWidth: () => 1,
            padding: 50
          };
          break;
        case 'grid':
          layoutOptions = {
            ...layoutOptions,
            padding: 50,
            avoidOverlap: true
          };
          break;
      }

      const layout = cyRef.current.layout(layoutOptions);
      layout.run();
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* 控制面板 */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg shadow-lg p-3 space-y-2">
        <button
          onClick={fitView}
          className="w-full px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          适应视图
        </button>
        <button
          onClick={resetLayout}
          className="w-full px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          重新布局
        </button>
        <div className="border-t pt-2">
          <div className="text-xs text-gray-600 mb-1">布局类型</div>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => changeLayout('breadthfirst')}
              className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
            >
              树形
            </button>
            <button
              onClick={() => changeLayout('circle')}
              className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
            >
              环形
            </button>
            <button
              onClick={() => changeLayout('concentric')}
              className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
            >
              同心圆
            </button>
            <button
              onClick={() => changeLayout('grid')}
              className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
            >
              网格
            </button>
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg shadow-lg p-3">
        <h4 className="text-sm font-semibold mb-2">图例</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <span>选中文件</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-400"></div>
            <span>热点文件</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <span>普通文件</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span>孤立文件</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizedTreeGraph; 
