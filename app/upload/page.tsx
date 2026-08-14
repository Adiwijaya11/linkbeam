import { FileUploader } from '@/components/FileUploader';

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">
          Demo Direct Client Upload
        </h1>
        <p className="text-slate-500 font-medium">
          Upload video dan foto berukuran besar langsung ke Vercel Blob CDN.
        </p>
      </div>

      <FileUploader />
    </main>
  );
}