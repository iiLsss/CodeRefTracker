import React, { useEffect, useRef, useCallback, useState } from 'react';
import { GraphData } from '../../types';

interface OptimizedMatrixGraphProps {
  data: GraphData;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string) => void;
}

interface MatrixCell {
  source: string;
  target: string;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const OptimizedMatrixGraph: React.FC<OptimizedMatrixGraphProps> = ({ 
  data, 
  selectedNode, 
  onNodeSelect 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCell, setHoveredCell] = useState<MatrixCell | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  // 构建矩阵数据
  const buildMatrixData = useCallback(() => {
    if (!data || data.nodes.length === 0) {return { matrix: [], nodes: [] };}

    const nodes = data.nodes.slice(0, 50); // 限制节点数量以提高性能
    const nodeMap = new Map(nodes.map((node, index) => [node.id, index]));
    
    // 创建矩阵
    const matrix: number[][] = Array(nodes.length).fill(0).map(() => Array(nodes.length).fill(0));
    
    // 填充矩阵
    data.links.forEach(link => {
      const sourceIndex = nodeMap.get(link.source);
      const targetIndex = nodeMap.get(link.target);
      if (sourceIndex !== undefined && targetIndex !== undefined) {
        matrix[sourceIndex][targetIndex] = 1;
      }
    });

    return { matrix, nodes };
  }, [data]);

  // 绘制矩阵
  const drawMatrix = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {return;}

    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    const { matrix, nodes } = buildMatrixData();
    if (nodes.length === 0) {return;}

    // 设置画布大小
    const containerRect = container.getBoundingClientRect();
    const size = Math.min(containerRect.width - 200, containerRect.height - 100);
    canvas.width = size;
    canvas.height = size;

    // 清空画布
    ctx.clearRect(0, 0, size, size);

    const cellSize = size / nodes.length;
    const fontSize = Math.max(8, Math.min(12, cellSize * 0.6));

    // 绘制网格和矩阵
    matrix.forEach((row, i) => {
      row.forEach((value, j) => {
        const x = j * cellSize;
        const y = i * cellSize;

        // 绘制单元格
        if (value > 0) {
          // 有引用关系
          const isSelected = nodes[i].id === selectedNode || nodes[j].id === selectedNode;
          ctx.fillStyle = isSelected ? '#ff6b6b' : '#4dabf7';
          ctx.fillRect(x, y, cellSize, cellSize);
        } else {
          // 无引用关系
          ctx.fillStyle = '#f8f9fa';
          ctx.fillRect(x, y, cellSize, cellSize);
        }

        // 绘制边框
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, cellSize, cellSize);

        // 绘制对角线（自引用）
        if (i === j) {
          ctx.fillStyle = '#868e96';
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      });
    });

    // 绘制行标签
    ctx.fillStyle = '#333';
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    nodes.forEach((node, i) => {
      const y = i * cellSize + cellSize / 2;
      const text = node.name.length > 15 ? node.name.substring(0, 15) + '...' : node.name;
      ctx.fillText(text, -5, y);
    });

    // 绘制列标签
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    nodes.forEach((node, j) => {
      const x = j * cellSize + cellSize / 2;
      const text = node.name.length > 15 ? node.name.substring(0, 15) + '...' : node.name;
      
      ctx.save();
      ctx.translate(x, -5);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    });
    
    ctx.restore();

    // 存储单元格信息用于交互
    const cells: MatrixCell[] = [];
    matrix.forEach((row, i) => {
      row.forEach((value, j) => {
        cells.push({
          source: nodes[i].id,
          target: nodes[j].id,
          value,
          x: j * cellSize,
          y: i * cellSize,
          width: cellSize,
          height: cellSize
        });
      });
    });

    // 将单元格信息存储到canvas元素上
    (canvas as any).matrixCells = cells;
    (canvas as any).matrixNodes = nodes;
    (canvas as any).cellSize = cellSize;

  }, [data, selectedNode, buildMatrixData]);

  // 处理鼠标事件
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {return;}

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const cells = (canvas as any).matrixCells as MatrixCell[];
    const nodes = (canvas as any).matrixNodes;
    
    if (!cells || !nodes) {return;}

    // 查找悬停的单元格
    const cell = cells.find(c => 
      x >= c.x && x < c.x + c.width && 
      y >= c.y && y < c.y + c.height
    );

    if (cell) {
      setHoveredCell(cell);
      const sourceNode = nodes.find((n: any) => n.id === cell.source);
      const targetNode = nodes.find((n: any) => n.id === cell.target);
      
      if (sourceNode && targetNode) {
        setTooltip({
          x: event.clientX,
          y: event.clientY,
          content: `${sourceNode.name} → ${targetNode.name}\n${cell.value ? '有引用' : '无引用'}`
        });
      }
    } else {
      setHoveredCell(null);
      setTooltip(null);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
    setTooltip(null);
  }, []);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {return;}

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const cells = (canvas as any).matrixCells as MatrixCell[];
    
    if (!cells) {return;}

    // 查找点击的单元格
    const cell = cells.find(c => 
      x >= c.x && x < c.x + c.width && 
      y >= c.y && y < c.y + c.height
    );

    if (cell && cell.value > 0) {
      onNodeSelect(cell.source);
    }
  }, [onNodeSelect]);

  // 初始化和更新
  useEffect(() => {
    drawMatrix();
  }, [drawMatrix]);

  // 窗口大小变化时重绘
  useEffect(() => {
    const handleResize = () => {
      setTimeout(drawMatrix, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawMatrix]);

  // 获取统计信息
  const getStatistics = useCallback(() => {
    const { matrix, nodes } = buildMatrixData();
    if (nodes.length === 0) {return { totalCells: 0, activeCells: 0, density: 0 };}

    const totalCells = matrix.length * matrix.length;
    const activeCells = matrix.flat().filter(v => v > 0).length;
    const density = (activeCells / totalCells * 100).toFixed(1);

    return { totalCells, activeCells, density };
  }, [buildMatrixData]);

  const stats = getStatistics();

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* 标题和统计 */}
      <div className="flex-shrink-0 p-4 bg-gray-50 border-b">
        <h3 className="text-lg font-semibold mb-2">引用关系矩阵</h3>
        <div className="flex space-x-4 text-sm text-gray-600">
          <span>节点数: {buildMatrixData().nodes.length}</span>
          <span>总单元格: {stats.totalCells}</span>
          <span>有引用: {stats.activeCells}</span>
          <span>密度: {stats.density}%</span>
        </div>
      </div>

      {/* 矩阵图 */}
      <div className="flex-1 relative overflow-auto p-4">
        <div ref={containerRef} className="w-full h-full flex items-center justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={handleClick}
              className="border border-gray-300 cursor-pointer"
              style={{ marginLeft: '100px', marginTop: '50px' }}
            />
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg shadow-lg p-3">
        <h4 className="text-sm font-semibold mb-2">图例</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-400"></div>
            <span>有引用关系</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-400"></div>
            <span>选中文件相关</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-400"></div>
            <span>自引用</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-100 border"></div>
            <span>无引用关系</span>
          </div>
        </div>
      </div>

      {/* 控制面板 */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg shadow-lg p-3 space-y-2">
        <button
          onClick={drawMatrix}
          className="w-full px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          刷新矩阵
        </button>
        <div className="text-xs text-gray-600">
          <div>行: 源文件</div>
          <div>列: 目标文件</div>
          <div>点击单元格选择文件</div>
        </div>
      </div>

      {/* 工具提示 */}
      {tooltip && (
        <div
          className="fixed bg-black bg-opacity-75 text-white text-xs p-2 rounded pointer-events-none z-50 whitespace-pre-line"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default OptimizedMatrixGraph; 
