'use client';

import React, { useState, useRef } from 'react';
import { upload } from '@vercel/blob/client';

export function FileUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
  const MAX_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setUploadedUrl(null);
    setUploadProgress(0);

    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    // 1. Validation: File Type
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setErrorMessage('Tipe file tidak didukung. Harap pilih gambar (JPEG, PNG, WebP) atau video (MP4).');
      setFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Validation: File Size
    if (selectedFile.size > MAX_SIZE_BYTES) {
      setErrorMessage('File terlalu besar. Batas maksimal adalah 1 GB.');
      setFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        onUploadProgress: (progressEvent) => {
          setUploadProgress(progressEvent.percentage);
        },
      });

      setUploadedUrl(blob.url);
      setFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat mengunggah.';
      setErrorMessage('Gagal mengunggah: ' + message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setUploadedUrl(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
      <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Uploader Media</h2>

      {errorMessage && (
        <div className="mb-5 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-medium flex items-start gap-2 animate-fade-in">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {uploadedUrl && (
        <div className="mb-6 p-5 bg-emerald-50 border border-emerald-100 rounded-xl animate-fade-in text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-emerald-800 font-semibold mb-2">Upload Berhasil!</p>
          <div className="flex gap-2 items-center bg-white border border-emerald-200 rounded-lg p-2.5 shadow-sm">
            <input
              type="text"
              readOnly
              value={uploadedUrl}
              className="flex-grow text-xs text-slate-600 font-mono focus:outline-none overflow-x-auto"
            />
            <button
              onClick={() => navigator.clipboard.writeText(uploadedUrl)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 whitespace-nowrap px-2"
            >
              Salin Link
            </button>
          </div>
          <button
            onClick={handleReset}
            className="mt-4 text-xs font-semibold text-slate-500 hover:text-slate-700 underline"
          >
            Unggah File Lain
          </button>
        </div>
      )}

      {!uploadedUrl && (
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors p-6 text-center relative min-h-[220px]">
            {previewUrl ? (
              <div className="w-full flex flex-col items-center">
                {file?.type.startsWith('video/') ? (
                  <video
                    src={previewUrl}
                    controls
                    className="max-h-48 w-auto rounded-lg shadow-sm border border-slate-200"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-48 w-auto rounded-lg shadow-sm border border-slate-200 object-cover"
                  />
                )}
                <div className="mt-3 text-sm font-medium text-slate-700 truncate max-w-full px-4">
                  {file?.name}
                </div>
                <div className="text-xs text-slate-400">
                  {(file ? file.size / (1024 * 1024) : 0).toFixed(2)} MB
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-3 text-xs font-semibold text-rose-500 hover:text-rose-600"
                >
                  Hapus File
                </button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full py-6">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-400 mb-4">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-700 mb-1 text-sm">Klik untuk unggah file</p>
                <p className="text-xs text-slate-500">Mendukung gambar (JPEG, PNG, WebP) atau video (MP4) hingga 1 GB</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp,video/mp4"
                  className="hidden"
                />
              </label>
            )}
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Mengunggah...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-sky-500 h-2 rounded-full transition-all duration-150"
                  style={{ width: uploadProgress + '%' }}
                />
              </div>
            </div>
          )}

          {!isUploading && (
            <button
              type="submit"
              disabled={!file}
              className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md shadow-sky-500/10 hover:shadow-sky-500/20 disabled:shadow-none flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Unggah Sekarang
            </button>
          )}
        </form>
      )}
    </div>
  );
}