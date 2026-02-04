import React from 'react';

// Icons
export const DashboardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

export const JellyfinIcon = () => (
    <img 
        src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/jellyfin.png" 
        alt="Jellyfin" 
        className="h-6 w-6 object-contain icon-jellyfin"
    />
);

export const AutomationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v2m-6 3h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1V8a1 1 0 011-1z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h.01M15 13h.01M10 18h4M8 21h8" />
    </svg>
);

export const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12a3 3 0 106 0 3 3 0 00-6 0z" />
    </svg>
);

export const ShieldIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

export const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

export const SmallShieldIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

export const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

export const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

export const ShieldCheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944a11.955 11.955 0 019-4.944c3.393 0 6.454 1.449 8.618 3.04A12.02 12.02 0 0021 10.944c0-3.393-1.449-6.454-3.04-8.618z" />
    </svg>
);

export const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const GridViewIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
);

export const ListViewIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

export const MedusaLogo = ({ className = "h-10 w-10", pulse = true }) => (
    <div className={`relative ${className}`}>
        <style>{`
            @keyframes medusa-flow {
                0% { stroke-dashoffset: 100; opacity: 0.3; }
                50% { opacity: 1; }
                100% { stroke-dashoffset: 0; opacity: 0.3; }
            }
            @keyframes medusa-pulse {
                0%, 100% { transform: scale(1); filter: brightness(1); }
                50% { transform: scale(1.05); filter: brightness(1.3); }
            }
            .snake-path {
                stroke-dasharray: 50;
                animation: medusa-flow 3s linear infinite;
            }
            .snake-node {
                animation: medusa-pulse 2s ease-in-out infinite;
            }
        `}</style>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_10px_rgba(170,0,255,0.3)]">
            {/* Les serpents-câbles technologiques */}
            <g className="text-white">
                {/* Serpent Gauche Haut */}
                <path d="M45 40C30 35 20 45 15 35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="snake-path" style={{ animationDelay: '0s' }} />
                <circle cx="15" cy="35" r="2.5" fill="currentColor" className="snake-node" />
                
                {/* Serpent Gauche Milieu */}
                <path d="M42 50C25 45 15 55 10 50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="snake-path" style={{ animationDelay: '0.5s' }} />
                <circle cx="10" cy="50" r="2.5" fill="currentColor" className="snake-node" />

                {/* Serpent Gauche Bas */}
                <path d="M45 60C30 65 20 55 15 65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="snake-path" style={{ animationDelay: '1s' }} />
                <circle cx="15" cy="65" r="2.5" fill="currentColor" className="snake-node" />

                {/* Serpent Droite Haut */}
                <path d="M55 40C70 35 80 45 85 35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="snake-path" style={{ animationDelay: '0.2s' }} />
                <circle cx="85" cy="35" r="2.5" fill="currentColor" className="snake-node" />
                
                {/* Serpent Droite Milieu */}
                <path d="M58 50C75 45 85 55 90 50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="snake-path" style={{ animationDelay: '0.7s' }} />
                <circle cx="90" cy="50" r="2.5" fill="currentColor" className="snake-node" />

                {/* Serpent Droite Bas */}
                <path d="M55 60C70 65 80 55 85 65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="snake-path" style={{ animationDelay: '1.2s' }} />
                <circle cx="85" cy="65" r="2.5" fill="currentColor" className="snake-node" />
            </g>

            {/* Silhouette du visage (Le Noyau) */}
            <path 
                d="M50 30C40 30 35 40 35 55C35 75 50 85 50 85C50 85 65 75 65 55C65 40 60 30 50 30Z" 
                fill="currentColor" 
                className="text-white/10 backdrop-blur-md"
            />
            <path 
                d="M50 30C40 30 35 40 35 55C35 75 50 85 50 85C50 85 65 75 65 55C65 40 60 30 50 30Z" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                className="text-white"
            />
            
            {/* L'œil technologique central */}
            <circle cx="50" cy="52" r="6" stroke="white" strokeWidth="1.5" className="opacity-80" />
            <circle cx="50" cy="52" r="2" fill="white" className={pulse ? 'animate-pulse' : ''} />
            
            {/* Détails de circuit sur le front */}
            <path d="M45 40H55M50 35V40" stroke="white" strokeWidth="1" strokeLinecap="round" className="opacity-40" />
        </svg>
    </div>
);