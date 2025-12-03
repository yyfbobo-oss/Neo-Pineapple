import React from 'react';
import { Logo } from './Logo';

interface LoadingOverlayProps {
  message: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neon-dark/90 backdrop-blur-md">
      <div className="animate-bounce">
        <Logo size="lg" />
      </div>
      <div className="mt-12 space-y-2 text-center">
        <p className="text-xl text-neon-cyan font-mono animate-pulse">{message}</p>
        <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-gradient-to-r from-neon-pink to-neon-yellow animate-progress w-full origin-left scale-x-0 animate-[grow_2s_infinite]"></div>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-pink/10 rounded-full blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>
    </div>
  );
};
