# Code Reference Tracker

VSCode 扩展，用于分析和可视化代码引用关系。

## 功能

- **代码引用分析**：分析工作区中的文件引用关系
- **文件树视图**：在文件树中显示引用计数
- **可视化图表**：提供多种可视化方式查看代码引用关系
  - 网络图：显示文件之间的引用关系
  - 树形图：以树形结构显示引用关系
  - 矩阵视图：以矩阵形式显示引用关系
  - 热图：以热图形式显示引用热度

## 使用方法

1. 安装扩展后，在 VSCode 侧边栏中会出现 "Code References" 视图
2. 点击 "Refresh" 按钮分析当前工作区的代码引用
3. 在文件树中查看每个文件的引用计数
4. 点击 "Show Graph" 按钮打开可视化视图
5. 在可视化视图中选择不同的视图模式查看代码引用关系

## 命令

- `CodeRefTracker: Refresh References` - 刷新代码引用分析
- `CodeRefTracker: Show Graph` - 显示代码引用图表
- `CodeRefTracker: Find References` - 查找文件的引用关系

## 技术栈

- TypeScript
- VSCode API
- React
- Tailwind CSS
- D3.js

## 开发

### 前提条件

- Node.js 14+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 编译

```bash
npm run compile
```

### 运行

按 F5 在开发模式下启动扩展。

### 打包

```bash
npm run package
```

## 许可证

MIT
