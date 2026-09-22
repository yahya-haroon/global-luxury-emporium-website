import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
      <h1 className="font-serif text-5xl sm:text-6xl text-text font-medium">404</h1>
      <h2 className="font-serif text-2xl text-text font-normal">Page Not Found</h2>
      <p className="text-muted max-w-md mx-auto font-light">
        The page you are looking for does not exist or has been relocated.
      </p>
      <div className="pt-4 max-w-xs mx-auto">
        <Link to="/" className="btn inline-flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Return to Collection
        </Link>
      </div>
    </div>
  );
};
