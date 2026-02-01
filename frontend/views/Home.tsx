import React from 'react';
import { Link } from 'react-router-dom';

interface ActionCard {
  id: string;
  title: string;
  description: string;
  path: string;
}

const actions: ActionCard[] = [
  {
    id: '01',
    title: 'START A NEW CAMPAIGN',
    description: 'Launch a new outreach sequence to a targeted list of prospects.',
    path: '/objectives',
  },
  {
    id: '02',
    title: 'DISCOVER COMPANIES',
    description: 'Search for high-value sponsors using AI-powered discovery.',
    path: '/agents',
  },
  {
    id: '03',
    title: 'DRAFT OUTREACH EMAILS',
    description: 'Compose personalized emails with advanced tools.',
    path: '/sponsors',
  },
  {
    id: '04',
    title: 'VIEW ACTIVE CAMPAIGNS',
    description: 'Monitor your ongoing outreach efforts and response rates.',
    path: '/objectives',
  },
];

const settingsAction: ActionCard = {
  id: '05',
  title: 'SET UP YOUR CLUB PROFILE',
  description: 'Configure your organization settings, team identity, and sending domains.',
  path: '/settings',
};

const Home: React.FC = () => {
  return (
    <div className="flex-1 h-full bg-muted/30 p-8 lg:p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6 pt-8">
        {/* 2x2 Grid for first 4 actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {actions.map((action) => (
            <Link
              key={action.id}
              to={action.path}
              className="group block bg-white border border-border rounded-sm p-8 hover:border-foreground/20 transition-colors min-h-[200px]"
            >
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground font-mono text-sm">
                    {action.id}
                  </span>
                  <h2 className="font-mono text-base font-bold tracking-wide text-foreground">
                    {action.title}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Full-width 5th action */}
        <Link
          to={settingsAction.path}
          className="group block bg-white border border-border rounded-sm p-8 hover:border-foreground/20 transition-colors"
        >
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-muted-foreground font-mono text-sm">
                {settingsAction.id}
              </span>
              <h2 className="font-mono text-base font-bold tracking-wide text-foreground">
                {settingsAction.title}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              {settingsAction.description}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Home;
