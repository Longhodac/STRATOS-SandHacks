
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './views/Home';
import Sponsors from './views/Sponsors';
import DataScan from './views/DataScan';
import Settings from './views/Settings';
import Analytics from './views/Analytics';
import Advisor from './views/Advisor';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/leads" element={<Sponsors />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/scan" element={<DataScan />} />
          <Route path="/advisor" element={<Advisor />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
