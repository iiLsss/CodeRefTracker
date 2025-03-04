import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 获取 VSCode API
declare global {
  interface Window {
    acquireVsCodeApi: () => {
      postMessage: (message: any) => void;
      getState: () => any;
      setState: (state: any) => void;
    };
  }
}

// 获取 VSCode API
const vscode = window.acquireVsCodeApi();

// 渲染应用
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App vscode={vscode} />
  </React.StrictMode>
); 
