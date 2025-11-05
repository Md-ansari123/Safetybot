import React from 'react';
import { AvatarTheme } from '../App';

interface BotIconProps extends React.SVGProps<SVGSVGElement> {
    theme: AvatarTheme;
}

const themes = {
    emerald: { glow: 'rgb(52, 211, 153)', glowStop: 'rgb(16, 185, 129)', stroke: 'rgba(110, 231, 183, 0.7)', circuit: 'rgba(52, 211, 153, 0.3)', eyebrow: 'rgba(110, 231, 183, 0.9)', eye: 'rgb(110, 231, 183)', mouth: 'rgb(110, 231, 183)', thinkingFrom: 'rgba(52, 211, 153, 0.4)', thinkingTo: 'rgba(110, 231, 183, 0.9)' },
    sapphire: { glow: 'rgb(96, 165, 250)', glowStop: 'rgb(59, 130, 246)', stroke: 'rgba(147, 197, 253, 0.7)', circuit: 'rgba(96, 165, 250, 0.3)', eyebrow: 'rgba(147, 197, 253, 0.9)', eye: 'rgb(147, 197, 253)', mouth: 'rgb(147, 197, 253)', thinkingFrom: 'rgba(96, 165, 250, 0.4)', thinkingTo: 'rgba(147, 197, 253, 0.9)' },
    ruby: { glow: 'rgb(248, 113, 113)', glowStop: 'rgb(239, 68, 68)', stroke: 'rgba(252, 165, 165, 0.7)', circuit: 'rgba(248, 113, 113, 0.3)', eyebrow: 'rgba(252, 165, 165, 0.9)', eye: 'rgb(252, 165, 165)', mouth: 'rgb(252, 165, 165)', thinkingFrom: 'rgba(248, 113, 113, 0.4)', thinkingTo: 'rgba(252, 165, 165, 0.9)' },
};

export const BotIcon: React.FC<BotIconProps> = ({ theme, ...rest }) => {
    const currentTheme = themes[theme];

    return (
        <svg {...rest} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <style>
                {`@keyframes thinking-anim-${theme} {
                    from { stroke: ${currentTheme.thinkingFrom}; }
                    to { stroke: ${currentTheme.thinkingTo}; }
                }
                .bot-avatar.is-focused .circuit-lines {
                    animation-name: thinking-anim-${theme};
                }`}
            </style>
            <defs>
                <radialGradient id={`aiGlow-${theme}`} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" style={{ stopColor: currentTheme.glow, stopOpacity: 0.6 }} />
                    <stop offset="100%" style={{ stopColor: currentTheme.glowStop, stopOpacity: 0 }} />
                </radialGradient>
                <radialGradient id="alertGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" style={{ stopColor: 'rgb(239, 68, 68)', stopOpacity: 0.6 }} />
                    <stop offset="100%" style={{ stopColor: 'rgb(220, 38, 38)', stopOpacity: 0 }} />
                </radialGradient>
                <filter id="blur"><feGaussianBlur in="SourceGraphic" stdDeviation="2" /></filter>
            </defs>
            <circle cx="50" cy="50" r="48" fill={`url(#aiGlow-${theme})`} filter="url(#blur)" className="glow-circle" />
            <path d="M50,10 C77.6,10 100,32.4 100,60 C100,87.6 77.6,110 50,110 C22.4,110 0,87.6 0,60 C0,32.4 22.4,10 50,10 Z" transform="translate(0, -15)" fill="none" stroke={currentTheme.stroke} strokeWidth="1" className="head-outline" />
            <path d="M30 40 Q 50 50, 70 40 M35 50 Q 50 60, 65 50 M40 60 Q 50 70, 60 60" fill="none" stroke={currentTheme.circuit} strokeWidth="0.5" className="circuit-lines" />
            <path d="M32 36 Q 38 33, 44 36" stroke={currentTheme.eyebrow} strokeWidth="1.5" strokeLinecap="round" fill="none" className="eyebrow left-eyebrow" />
            <path d="M56 36 Q 62 33, 68 36" stroke={currentTheme.eyebrow} strokeWidth="1.5" strokeLinecap="round" fill="none" className="eyebrow right-eyebrow" />
            <circle cx="38" cy="45" r="3.5" fill={currentTheme.eye} className="eye left-eye" />
            <circle cx="62" cy="45" r="3.5" fill={currentTheme.eye} className="eye right-eye" />
            <path d="M40 70 Q 50 72, 60 70" stroke={currentTheme.mouth} strokeWidth="1.5" strokeLinecap="round" fill="none" className="mouth" />
        </svg>
    )
};

export const HistoryIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438.995s.145.755.438.995l1.003.827c.424.35.534.954.26 1.431l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.437-.995s-.145-.755-.437-.995l-1.004-.827a1.125 1.125 0 01-.26-1.431l1.296-2.247a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.213-1.28z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);