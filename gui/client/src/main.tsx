import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { ThemeModeProvider } from './ThemeContext';
import Layout from './components/Layout';
import Workflow from './pages/Workflow';
import ActiveWork from './pages/ActiveWork';
import Delivery from './pages/Delivery';
import IssueWorkspace from './pages/IssueWorkspace';
import Accounts from './pages/Accounts';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Workflow />} />
              <Route path="active-work" element={<ActiveWork />} />
              <Route path="delivery" element={<Delivery />} />
              <Route path="projects" element={<Accounts />} />
              <Route path="issues/:issueRef" element={<IssueWorkspace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeModeProvider>
  </React.StrictMode>
);
