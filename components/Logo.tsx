import React from 'react';

export const Logo: React.FC<{ size?: 'sm' | 'lg' }> = ({ size = 'lg' }) => {
  const isLg = size === 'lg';
  // Use a playful, cartoon-ish font stack
  const fontStyle = { fontFamily: '"Comic Sans MS", "Chalkboard SE", "Chewy", "Fredoka One", cursive, sans-serif' };
  
  const textClass = isLg ? 'text-5xl md:text-6xl' : 'text-xl';
  const iconSize = isLg ? 'w-24 h-28' : 'w-8 h-10';
  const gap = isLg ? 'gap-5' : 'gap-2';

  return (
    <div className={`flex items-center ${gap} select-none`}>
      {/* Icon: Realistic Neon Pineapple */}
      <div className={`${iconSize} relative flex items-center justify-center filter drop-shadow-[0_0_10px_rgba(255,255,0,0.5)]`}>
         <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
            <defs>
              <filter id="glow-leaves" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00ff00" floodOpacity="1"/>
              </filter>
              <filter id="glow-body" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#ffcc00" floodOpacity="1"/>
              </filter>
            </defs>

            {/* Leaves (Sharp & Realistic) */}
            <g filter="url(#glow-leaves)">
              <path d="M50 40 Q40 5 15 30" stroke="#39ff14" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M50 40 Q60 5 85 30" stroke="#39ff14" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M50 40 Q45 0 50 15" stroke="#39ff14" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M50 40 Q30 15 35 35" stroke="#39ff14" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M50 40 Q70 15 65 35" stroke="#39ff14" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>

            {/* Body (Realistic Shape & Texture) */}
            <g filter="url(#glow-body)">
              {/* Main Shape */}
              <path d="M30 40 C20 50 20 90 35 105 C45 115 55 115 65 105 C80 90 80 50 70 40 Z" stroke="#ffd700" strokeWidth="3" fill="none" />
              
              {/* Diamond Mesh Pattern */}
              <path d="M30 55 L70 95" stroke="#ffd700" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M25 70 L60 105" stroke="#ffd700" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M40 45 L75 80" stroke="#ffd700" strokeWidth="1.5" strokeLinecap="round" />
              
              <path d="M70 55 L30 95" stroke="#ffd700" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M75 70 L40 105" stroke="#ffd700" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M60 45 L25 80" stroke="#ffd700" strokeWidth="1.5" strokeLinecap="round" />
            </g>
         </svg>
      </div>

      {/* Text: Cartoon Style */}
      <div className={`flex items-baseline whitespace-nowrap ${textClass}`} style={fontStyle}>
        {/* 'Neo' - Pineapple Yellow */}
        <span 
          className="mr-3"
          style={{ 
            color: '#ffff00', // Pineapple Yellow
            textShadow: '0 0 5px #ffaa00, 0 0 15px #ffaa00, 2px 2px 0px #b8860b'
          }}
        >
          Neo
        </span>
        
        {/* 'Pineapple' - Highlight Pink */}
        <span 
          style={{ 
            color: '#ff00ff', // Highlight Pink
            textShadow: '0 0 5px #ff69b4, 0 0 15px #ff1493, 2px 2px 0px #8b008b'
          }}
        >
          Pineapple
        </span>
      </div>
    </div>
  );
};