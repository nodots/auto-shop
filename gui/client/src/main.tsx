import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CellsList from './pages/CellsList';
import CellDetail from './pages/CellDetail';
import CellCreate from './pages/CellCreate';
import Projects from './pages/Projects';
import MergeQueue from './pages/MergeQueue';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="cells" element={<CellsList />} />
            <Route path="cells/new" element={<CellCreate />} />
            <Route path="cells/:id" element={<CellDetail />} />
            <Route path="projects" element={<Projects />} />
            <Route path="merge-queue" element={<MergeQueue />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
