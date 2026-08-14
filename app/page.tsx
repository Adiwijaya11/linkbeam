'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

function generateRoomCode(): string {
  return Math.random()
    .toString(36)
    .substring(2, 7)
    .toUpperCase();
}

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');

  const handleStartSharing = () => {
    const code = generateRoomCode();
    router.push(`/room/${code}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      router.push(`/room/${roomCode.trim()}`);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-[#F8FAFC] relative overflow-x-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-primary/10 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-accent/10 blur-[100px] pointer-events-none -z-10" />

      <Card className="w-full max-w-md p-8 sm:p-12 relative z-10 text-center">
        {/* Logo */}
        <div className="mx-auto w-20 h-20 bg-[#0EA5E9] rounded-full flex items-center justify-center shadow-lg mb-8 shadow-brand-primary/30 pointer-events-none">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>

        <h1 className="text-4xl font-extrabold text-[#334155] tracking-tight mb-2 pointer-events-none">
          LinkBeam
        </h1>
        <p className="text-slate-500 text-lg mb-8 font-medium pointer-events-none">
          Beam files instantly between your devices
        </p>

        <div className="bg-slate-50/50 backdrop-blur-sm rounded-3xl p-8 mb-8 border border-white/60 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-brand-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          
          <div className="flex items-center gap-6 mb-5 relative z-10 pointer-events-none">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] flex items-center justify-center text-[#0EA5E9] border border-slate-100/80 transition-transform duration-300 group-hover:-translate-y-1">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            
            <div className="flex flex-col gap-1.5 text-[#14B8A6] pointer-events-none">
               <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
               </svg>
               <svg className="w-6 h-6 animate-pulse delay-150" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ animationDelay: '500ms' }}>
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
               </svg>
            </div>

            <div className="w-16 h-16 bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] flex items-center justify-center text-[#0EA5E9] border border-slate-100/80 transition-transform duration-300 group-hover:-translate-y-1">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium relative z-10 pointer-events-none">Fast, secure, and simple.</p>
        </div>

        <div className="space-y-6 relative z-20">
          <Button type="button" fullWidth onClick={handleStartSharing} className="py-4 text-xl transition-transform touch-manipulation relative z-20">
            Start Sharing
          </Button>

          <div className="relative flex items-center py-2 pointer-events-none">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-medium">or join room</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleJoinRoom} className="flex gap-3 relative z-20">
            <input
              type="text"
              placeholder="Enter Room Code"
              className="flex-grow bg-slate-50 border border-slate-200 rounded-full px-6 py-3 text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/50 focus:border-[#14B8A6] transition-all font-medium uppercase placeholder:normal-case tracking-wider touch-manipulation relative z-20"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={5}
            />
            <Button variant="secondary" type="submit" className="px-8 transition-transform touch-manipulation relative z-20" disabled={!roomCode.trim()}>
              Join
            </Button>
          </form>
        </div>
      </Card>
    </main>
  );
}
