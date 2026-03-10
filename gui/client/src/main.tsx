import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { ThemeModeProvider } from './ThemeContext';
import Layout from './components/Layout';
import ShopFloor from './pages/ShopFloor';
import Bays from './pages/Bays';
import BayDetail from './pages/BayDetail';
import OpenBay from './pages/OpenBay';
import Accounts from './pages/Accounts';
import ReleaseLane from './pages/ReleaseLane';
import DispatchBoard from './pages/DispatchBoard';

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
              <Route index element={<ShopFloor />} />
              <Route path="bays" element={<Bays />} />
              <Route path="cells" element={<Bays />} />
              <Route path="bays/new" element={<OpenBay />} />
              <Route path="cells/new" element={<OpenBay />} />
              <Route path="bays/:id" element={<BayDetail />} />
              <Route path="cells/:id" element={<BayDetail />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="projects" element={<Accounts />} />
              <Route path="release-lane" element={<ReleaseLane />} />
              <Route path="merge-queue" element={<ReleaseLane />} />
              <Route path="dispatch" element={<DispatchBoard />} />
              <Route path="scheduler" element={<DispatchBoard />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeModeProvider>
  </React.StrictMode>
);
