'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

export default function DonePage() {
  const router = useRouter();

  const handleReturn = () => {
    router.push('/');
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-brand-bg relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-brand-accent/10 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md p-10 sm:p-14 relative z-10 text-center flex flex-col items-center">
        {/* Success Icon */}
        <div className="w-24 h-24 bg-brand-accent/10 rounded-full flex items-center justify-center mb-8 relative">
          <div className="absolute inset-0 bg-brand-accent/20 rounded-full animate-ping opacity-75"></div>
          <svg
            className="w-12 h-12 text-brand-accent relative z-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-extrabold text-brand-text mb-3">
          Transfer Complete
        </h1>
        <p className="text-slate-500 mb-8 font-medium">
          Your file has been successfully sent to all connected devices.
        </p>

        {/* File info card */}
        <div className="bg-slate-50 rounded-2xl w-full p-4 mb-10 border border-slate-100 flex items-center gap-4">
           <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-primary flex-shrink-0">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
           </div>
           <div className="text-left overflow-hidden">
             <p className="font-semibold text-brand-text truncate">presentation_final.pdf</p>
             <p className="text-xs text-slate-500">2.4 MB • Sent via LinkBeam</p>
           </div>
        </div>

        <Button fullWidth onClick={handleReturn} className="py-4">
          Send Another File
        </Button>
      </Card>
    </main>
  );
}
