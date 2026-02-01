import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ClubProfileProvider } from '@/lib/ClubProfileContext';
import { FocusProvider } from '@/lib/FocusContext';
import Layout from './components/Layout';
import Home from './views/Home';
import Objectives from './views/Objectives';
import Clubs from './views/Clubs';
import Sponsors from './views/Sponsors';
import Settings from './views/Settings';
import Advisor from './views/Advisor';

const App: React.FC = () => {
  return (
    <Router>
      <ClubProfileProvider>
        <FocusProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/objectives" element={<Objectives />} />
              <Route path="/clubs" element={<Clubs />} />
              <Route path="/sponsors" element={<Sponsors />} />
              <Route path="/advisor" element={<Advisor />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </FocusProvider>
      </ClubProfileProvider>
    </Router>
  );
};

export default App;
