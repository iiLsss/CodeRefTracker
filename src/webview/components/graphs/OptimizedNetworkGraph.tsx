import React, { useEffect, useRef, useCallback } from 'react';
import { Network, DataSet, Options } from 'vis-network';
import { GraphData } from '../../types';

interface OptimizedNetworkGraphProps {
  data: GraphData;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string) => void;
}

const OptimizedNetworkGraph: React.FC<OptimizedNetworkGraphProps> = ({ 
  data, 
  selectedNode, 
  onNodeSelect 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  // 获取节点颜色
  const getNodeColor = useCallback((node: any) => {
    if (node.id === selectedNode) {
      return { background: '#ff6b6b', border: '#ff5252' }; // 选中节点
    } else if (node.incomingCount > 5 || node.outgoingCount > 5) {
      return { background: '#ffa94d', border: '#ff8a65' }; // 热点文件
    } else if (node.incomingCount === 0 && node.outgoingCount === 0) {
      return { background: '#868e96', border: '#757575' }; // 孤立文件
    } else if (node.incomingCount === 0) {
      return { background: '#4dabf7', border: '#42a5f5' }; // 只有传出引用
    } else if (node.outgoingCount === 0) {
      return { background: '#38d9a9', border: '#26a69a' }; // 只有传入引用
    }
    return { background: '#74c0fc', border: '#64b5f6' }; // 默认
  }, [selectedNode]);

  // 获取节点大小
  const getNodeSize = useCallback((node: any) => {
    const totalRefs = node.incomingCount + node.outgoingCount;
    return Math.max(10, Math.min(30, 10 + totalRefs * 2));
  }, []);

  // 创建网络图
  useEffect(() => {
    if (!containerRef.current || !data || data.nodes.length === 0) {
      return;
    }

    // 准备节点数据
    const nodes = new DataSet(
      data.nodes.map(node => ({
        id: node.id,
        label: node.name,
        title: `${node.name}\n入度: ${node.incomingCount}\n出度: ${node.outgoingCount}\n路径: ${node.fullPath}`,
        color: getNodeColor(node),
        size: getNodeSize(node),
        font: {
          size: 12,
          color: '#333333'
        },
        borderWidth: 2,
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.2)',
          size: 5,
          x: 2,
          y: 2
        }
      }))
    );

    // 准备边数据
    const edges = new DataSet(
      data.links.map((link, index) => ({
        id: index,
        from: link.source,
        to: link.target,
        arrows: 'to',
        color: {
          color: '#999999',
          highlight: '#ff6b6b',
          hover: '#ffa94d'
        },
        width: 1,
        smooth: {
          enabled: true,
          type: 'dynamic',
          roundness: 0.5
        }
      }))
    );

    // 网络配置
    const options: Options = {
      nodes: {
        shape: 'dot',
        scaling: {
          min: 10,
          max: 30
        }
      },
      edges: {
        width: 0.15,
        color: { inherit: 'from' },
        smooth: {
          enabled: true,
          type: 'continuous',
          roundness: 0.5
        }
      },
      physics: {
        enabled: true,
        stabilization: {
          enabled: true,
          iterations: 200,
          updateInterval: 25
        },
        barnesHut: {
          gravitationalConstant: -8000,
          centralGravity: 0.3,
          springLength: 95,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0.1
        }
      },
      interaction: {
        hover: true,
        hoverConnectedEdges: true,
        selectConnectedEdges: false,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true
      },
      layout: {
        improvedLayout: true,
        clusterThreshold: 150
      }
    };

    // 创建网络实例
    const network = new Network(containerRef.current, { nodes, edges }, options);
    networkRef.current = network;

    // 事件监听
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        onNodeSelect(params.nodes[0] as string);
      }
    });

    network.on('hoverNode', (params) => {
      // 高亮连接的节点
      const connectedNodes = network.getConnectedNodes(params.node);
      const updateArray = [params.node, ...connectedNodes].map(nodeId => {
        const nodeData = nodes.get(nodeId);
        if (nodeData) {
          return {
            ...nodeData,
            color: {
              background: (nodeData as any).color.background,
              border: '#ff6b6b'
            }
          };
        }
        return nodeData;
      }).filter(Boolean);
      nodes.update(updateArray);
    });

    network.on('blurNode', () => {
      // 恢复所有节点颜色
      const allNodes = data.nodes.map(node => ({
        id: node.id,
        color: getNodeColor(node)
      }));
      nodes.update(allNodes);
    });

    // 清理函数
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [data, selectedNode, onNodeSelect, getNodeColor, getNodeSize]);

  // 更新选中节点样式
  useEffect(() => {
    if (networkRef.current && data) {
      try {
        // 使用类型断言来访问内部属性
        const networkData = (networkRef.current as any).body?.data?.nodes;
        if (networkData) {
          const updateArray = data.nodes.map(node => ({
            id: node.id,
            color: getNodeColor(node)
          }));
          networkData.update(updateArray);
        }
      } catch (error) {
        console.warn('Failed to update node colors:', error);
      }
    }
  }, [selectedNode, data, getNodeColor]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* 控制面板 */}
      <div className="absolute top-4 right-4 p-3 space-y-2 bg-white bg-opacity-90 rounded-lg shadow-lg">
        <button
          onClick={() => networkRef.current?.fit()}
          className="px-3 py-1 w-full text-sm text-white bg-blue-500 rounded transition-colors hover:bg-blue-600"
        >
          适应视图
        </button>
        <button
          onClick={() => networkRef.current?.redraw()}
          className="px-3 py-1 w-full text-sm text-white bg-green-500 rounded transition-colors hover:bg-green-600"
        >
          重新布局
        </button>
      </div>

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 p-3 bg-white bg-opacity-90 rounded-lg shadow-lg">
        <h4 className="mb-2 text-sm font-semibold">图例</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <span>选中文件</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
            <span>热点文件</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <span>普通文件</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span>孤立文件</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizedNetworkGraph; 
