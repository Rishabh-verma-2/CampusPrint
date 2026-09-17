import React from 'react';
import { Navbar } from '../../components/landing/Navbar';
import { Hero } from '../../components/landing/Hero';
import { WorkflowSteps } from '../../components/landing/WorkflowSteps';
import { Footer } from '../../components/landing/Footer';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <WorkflowSteps />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
