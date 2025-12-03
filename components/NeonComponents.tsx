import React from 'react';

// --- Button ---
interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const NeonButton: React.FC<NeonButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "relative px-6 py-3 font-bold uppercase tracking-wider transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none clip-path-slant";
  
  const variants = {
    primary: "bg-neon-pink text-white hover:shadow-[0_0_20px_#ff00ff] border border-neon-pink",
    secondary: "bg-transparent text-neon-cyan border border-neon-cyan hover:bg-neon-cyan/10 hover:shadow-[0_0_15px_#00ffff]",
    danger: "bg-transparent text-red-500 border border-red-500 hover:bg-red-500/10"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          PROCESSING...
        </span>
      ) : children}
    </button>
  );
};

// --- Input / Textarea ---
export const NeonInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
  return (
    <input
      ref={ref}
      className={`w-full bg-neon-dark border border-white/20 text-white p-4 rounded-none focus:outline-none focus:border-neon-pink focus:shadow-[0_0_10px_#ff00ff] transition-all placeholder-white/30 ${props.className}`}
      {...props}
    />
  );
});

export const NeonTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => {
  return (
    <textarea
      ref={ref}
      className={`w-full bg-neon-card border border-white/20 text-white p-4 rounded-none focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_10px_#00ffff] transition-all placeholder-white/30 ${props.className}`}
      {...props}
    />
  );
});

// --- Card ---
export const NeonCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`bg-neon-card border border-white/10 p-6 relative overflow-hidden group hover:border-white/30 transition-all ${className}`}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-pink via-neon-cyan to-neon-yellow opacity-0 group-hover:opacity-100 transition-opacity" />
      {children}
    </div>
  );
};
