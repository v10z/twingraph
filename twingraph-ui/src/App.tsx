import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkflowEditor } from './components/WorkflowEditor/WorkflowEditor';
import { Dashboard } from './pages/Dashboard';
import { ExecutionMonitor } from './pages/ExecutionMonitor';
import { GraphVisualizationPage } from './pages/GraphVisualization';
import { PageTransition } from './components/UI/PageTransition';
import {
  HomeIcon,
  WorkflowIcon,
  ExecutionIcon,
  GraphIcon,
  SettingsIcon
} from './components/Icons/Icons';
// CSS imported in main.tsx

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// VSCode-style Activity Bar
const ActivityBar: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { 
      path: '/', 
      icon: <HomeIcon />,
      label: 'Dashboard', 
      id: 'dashboard' 
    },
    { 
      path: '/editor', 
      icon: <WorkflowIcon />,
      label: 'Workflow Editor', 
      id: 'editor' 
    },
    { 
      path: '/executions', 
      icon: <ExecutionIcon />,
      label: 'Executions', 
      id: 'executions' 
    },
    { 
      path: '/graph', 
      icon: <GraphIcon />,
      label: 'Graph Visualization', 
      id: 'graph' 
    },
  ];

  return (
    <div className="w-12 bg-[#003666] flex flex-col items-center vscode-activity-bar">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || 
                        (item.path === '/editor' && location.pathname.startsWith('/editor'));
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`
              w-full py-3 flex items-center justify-center relative
              transition-all duration-150 group
              ${isActive 
                ? 'text-white' 
                : 'text-[#7aa6da] hover:text-white'
              }
            `}
          >
            <div className="w-6 h-6">{item.icon}</div>
            {isActive && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#6699cc]" />
            )}
            <div className="
              absolute left-full ml-2 px-2 py-1 bg-[#001733] border border-[#7aa6da20] rounded
              text-xs text-[#bbdaff] whitespace-nowrap opacity-0 group-hover:opacity-100
              transition-opacity duration-200 pointer-events-none z-50 shadow-lg
            ">
              {item.label}
            </div>
          </Link>
        );
      })}
      
      <div className="flex-1" />
      
      {/* Settings */}
      <button className="w-full py-3 flex items-center justify-center text-[#7aa6da] hover:text-white transition-colors duration-150 group relative">
        <SettingsIcon />
        <div className="
          absolute left-full ml-2 px-2 py-1 bg-[#001733] border border-[#7aa6da20] rounded
          text-xs text-[#bbdaff] whitespace-nowrap opacity-0 group-hover:opacity-100
          transition-opacity duration-200 pointer-events-none z-50 shadow-lg
        ">
          Settings
        </div>
      </button>
    </div>
  );
};

// VSCode-style Status Bar
const StatusBar: React.FC = () => {
  return (
    <div className="h-6 bg-[#6699cc] text-white text-xs flex items-center px-2 vscode-status-bar">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <span className="text-[#99c794]">●</span> Ready
        </span>
        <span className="flex items-center gap-1">
          <span className="text-[#99c794]">✓</span> Connected
        </span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <span>v2.0.1</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
};

function AppContent() {
  return (
    <div className="flex h-screen bg-[#002451] vscode-app">
      <ActivityBar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={
              <PageTransition>
                <Dashboard />
              </PageTransition>
            } />
            <Route path="/editor" element={
              <div className="h-full">
                <WorkflowEditor />
              </div>
            } />
            <Route path="/editor/:workflowId" element={
              <div className="h-full">
                <WorkflowEditor />
              </div>
            } />
            <Route path="/executions" element={
              <PageTransition>
                <ExecutionMonitor />
              </PageTransition>
            } />
            <Route path="/executions/:executionId" element={
              <PageTransition>
                <ExecutionMonitor />
              </PageTransition>
            } />
            <Route path="/graph" element={
              <PageTransition>
                <GraphVisualizationPage />
              </PageTransition>
            } />
          </Routes>
        </div>
        <StatusBar />
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    // VSCode-style setup
    document.body.style.margin = '0';
    document.body.style.backgroundColor = '#002451';
    document.body.style.overflow = 'hidden';
    document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

export default App;