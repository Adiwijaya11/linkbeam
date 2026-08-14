'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { getDeviceId, getDeviceName, getDeviceType, DeviceInfo } from '@/utils/device';

interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  senderName: string;
  sentAt: number;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
  if (type.startsWith('video/')) return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
  if (type.includes('pdf')) return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
  if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  );
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}

function DeviceIcon({ type }: { type: DeviceInfo['type'] }) {
  if (type === 'mobile') return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
  if (type === 'tablet') return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const code = (params?.code as string) || '';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  // Unified send progress (covers upload phase)
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0); // 0-100
  const [uploadSpeed, setUploadSpeed] = useState('');

  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [sharedFiles, setSharedFiles] = useState<FileMetadata[]>([]);
  const [myId, setMyId] = useState('');
  const [myName, setMyName] = useState('');
  const [roomUrl, setRoomUrl] = useState('');

  const deviceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const filesIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const leftRef = useRef(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // ── Device heartbeat ──────────────────────────────────────────────
  const joinAndPoll = useCallback(async (id: string, name: string, type: ReturnType<typeof getDeviceType>) => {
    if (!code) return;
    const heartbeat = async () => {
      if (leftRef.current) return;
      try {
        const res = await fetch(`/api/room/${code}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, name, type }),
        });
        const data = await res.json();
        setDevices(data.devices ?? []);
      } catch { /* retry */ }
    };
    await heartbeat();
    deviceIntervalRef.current = setInterval(heartbeat, 3000);
  }, [code]);

  // ── File list polling ──────────────────────────────────────────────
  const pollFiles = useCallback(async () => {
    if (!code) return;
    try {
      const res = await fetch(`/api/room/${code}/files`);
      const data = await res.json();
      setSharedFiles(data.files ?? []);
    } catch { /* retry */ }
  }, [code]);

  useEffect(() => {
    const id = getDeviceId();
    const name = getDeviceName();
    const type = getDeviceType();
    setMyId(id);
    setMyName(name);
    leftRef.current = false;
    joinAndPoll(id, name, type);
    setRoomUrl(`${window.location.origin}/room/${code}`);
    pollFiles();
    filesIntervalRef.current = setInterval(pollFiles, 3000);
    return () => {
      leftRef.current = true;
      if (deviceIntervalRef.current) clearInterval(deviceIntervalRef.current);
      if (filesIntervalRef.current) clearInterval(filesIntervalRef.current);
      if (xhrRef.current) xhrRef.current.abort();
      fetch(`/api/room/${code}?id=${id}`, { method: 'DELETE' }).catch(() => {});
    };
  }, [code, joinAndPoll, pollFiles]);

  const handleLeave = async () => {
    leftRef.current = true;
    if (deviceIntervalRef.current) clearInterval(deviceIntervalRef.current);
    if (filesIntervalRef.current) clearInterval(filesIntervalRef.current);
    if (xhrRef.current) xhrRef.current.abort();
    await fetch(`/api/room/${code}?id=${myId}`, { method: 'DELETE' }).catch(() => {});
    router.push('/');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };



  // ── XHR raw upload helper ──────────────────────────────────────────
  const uploadFileRaw = (
    file: File | Blob,
    fileName: string,
    senderName: string,
    onProgress?: (pct: number) => void
  ) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      let startTime = Date.now();

      xhr.upload.addEventListener('loadstart', () => { startTime = Date.now(); });
      xhr.upload.addEventListener('progress', (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress?.(pct);
        const elapsed = (Date.now() - startTime) / 1000 || 0.001;
        const bps = e.loaded / elapsed;
        setUploadSpeed(bps > 1_000_000
          ? `${(bps / 1_000_000).toFixed(1)} MB/s`
          : `${(bps / 1_000).toFixed(0)} KB/s`
        );
      });
      xhr.addEventListener('load', () => xhr.status === 200 ? resolve() : reject());
      xhr.addEventListener('error', reject);
      xhr.addEventListener('abort', reject);
      xhr.open('POST', `/api/room/${code}/files`);
      xhr.setRequestHeader('X-File-Name', encodeURIComponent(fileName));
      xhr.setRequestHeader('X-Sender-Name', encodeURIComponent(senderName));
      xhr.setRequestHeader('X-File-Type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('X-File-Size', String(file.size));
      xhr.send(file);
    });
  };

  // ── Send a single file ────────────────────────────────────────────
  const handleSendFile = async () => {
    if (!selectedFile) return;
    setIsSending(true);
    setSendProgress(0);
    setUploadSpeed('');
    try {
      let uploadedViaBlob = false;
      try {
        const { upload } = await import('@vercel/blob/client');
        let startTime = Date.now();
        
        await upload(selectedFile.name, selectedFile, {
          access: 'public',
          handleUploadUrl: `/api/room/${code}/files/upload`,
          clientPayload: JSON.stringify({ senderName: myName }),
          onUploadProgress: (progressEvent) => {
            setSendProgress(progressEvent.percentage);
            const elapsed = (Date.now() - startTime) / 1000 || 0.001;
            const bps = progressEvent.loaded / elapsed;
            setUploadSpeed(bps > 1_000_000
              ? `${(bps / 1_000_000).toFixed(1)} MB/s`
              : `${(bps / 1_000).toFixed(0)} KB/s`
            );
          }
        });
        uploadedViaBlob = true;
      } catch (blobErr) {
        console.warn('[LinkBeam] Vercel Blob client upload failed or not configured, falling back to local storage:', blobErr);
      }

      if (!uploadedViaBlob) {
        // Fallback to raw file upload (local dev without Vercel Blob token)
        await uploadFileRaw(selectedFile, selectedFile.name, myName, (pct) => {
          setSendProgress(pct);
        });
      }

      setSendProgress(100);
      await pollFiles();
      setTimeout(() => { setSelectedFile(null); setIsSending(false); setSendProgress(0); setUploadSpeed(''); }, 800);
    } catch (err) {
      console.error('[LinkBeam] Error uploading file:', err);
      setIsSending(false); setSendProgress(0); setUploadSpeed('');
    }
  };

  const handleCancel = () => {
    if (xhrRef.current) xhrRef.current.abort();
    setIsSending(false);
    setSendProgress(0);
    setUploadSpeed('');
  };

  const clearSelection = () => {
    setSelectedFile(null);
  };

  const hasSelection = selectedFile !== null;
  const isWorking = isSending;
  const downloadUrl = (fileId: string) => `/api/room/${code}/files/${fileId}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col p-4 sm:p-8 relative overflow-x-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#0EA5E9]/10 blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#14B8A6]/10 blur-[100px] -z-10 pointer-events-none" />

      {/* ── Header ── */}
      <header className="flex justify-between items-center mb-5 sm:mb-8 max-w-5xl mx-auto w-full relative z-10">
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-none">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#0EA5E9] rounded-full flex items-center justify-center shadow-md shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <span className="font-extrabold text-lg sm:text-xl text-[#334155]">LinkBeam</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-[#0EA5E9]/10 text-[#0EA5E9] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-mono font-bold tracking-widest text-base sm:text-lg uppercase pointer-events-none">
            {code}
          </div>
          {/* Mobile sidebar toggle */}
          <button
            type="button"
            onClick={() => setShowSidebar((v) => !v)}
            className="lg:hidden w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors touch-manipulation relative z-20"
            aria-label="Toggle QR & devices"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16M4 8h4m0 0V4m0 4h.01M20 4v.5M20 8v.5M4 20h.01" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-grow flex flex-col lg:flex-row gap-5 sm:gap-8 max-w-5xl mx-auto w-full items-start relative z-10">

        {/* ── Main Column ── */}
        <div className="flex-grow w-full flex flex-col gap-6">

          {/* ── Upload Card ── */}
          <Card className="w-full p-6 sm:p-8 flex flex-col">
            {/* Mode header */}
            <div className="flex items-center gap-2 mb-6 pointer-events-none">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Share a File
              </span>
              <span className="text-xs text-slate-400">
                Any format supported
              </span>
            </div>

            {/* Drop zone */}
            <div className="border-2 border-dashed border-slate-300 rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-slate-50 transition-colors min-h-[220px]">

              {/* Selection preview */}
              {hasSelection && !isWorking && (
                <div className="w-full max-w-sm flex flex-col items-center relative z-20">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 pointer-events-none bg-[#0EA5E9]/15 text-[#0EA5E9]">
                    <FileIcon type={selectedFile?.type ?? ''} />
                  </div>
                  <p className="font-semibold text-[#334155] truncate w-full text-base mb-1 pointer-events-none">
                    {selectedFile?.name}
                  </p>
                  <p className="text-slate-400 text-sm mb-4 pointer-events-none">
                    {formatBytes(selectedFile?.size ?? 0)}
                  </p>
                  <div className="flex gap-3 w-full mt-2">
                    <Button type="button" variant="secondary" onClick={clearSelection} className="flex-1 py-2 touch-manipulation relative z-20">Cancel</Button>
                    <Button
                      type="button"
                      onClick={handleSendFile}
                      className="flex-1 py-2 touch-manipulation relative z-20"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Send animation ── */}
              {isSending && (
                <div className="w-full max-w-sm flex flex-col items-center gap-4">
                  {/* Spinning icon */}
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center relative bg-[#0EA5E9]/15 text-[#0EA5E9]">
                    {/* Spinning ring */}
                    <svg
                      className="absolute inset-0 w-full h-full animate-spin"
                      viewBox="0 0 64 64"
                      fill="none"
                    >
                      <circle
                        cx="32" cy="32" r="28"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="44 132"
                        strokeLinecap="round"
                        opacity="0.4"
                      />
                    </svg>
                    {/* Static icon in centre */}
                    <span className="relative z-10 pointer-events-none">
                      <FileIcon type={selectedFile?.type ?? ''} />
                    </span>
                  </div>

                  {/* Name */}
                  <p className="font-semibold text-[#334155] truncate w-full text-center text-sm pointer-events-none">
                    {selectedFile?.name}
                  </p>

                  {/* Progress bar */}
                  <div className="w-full">
                    <ProgressBar progress={sendProgress} />
                    <div className="flex justify-between items-center text-xs mt-2">
                       <span className="font-medium animate-pulse text-[#0EA5E9]">
                        Uploading... {sendProgress}%
                      </span>
                      {uploadSpeed && (
                        <span className="text-[#14B8A6] font-bold flex items-center gap-1 pointer-events-none">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                          {uploadSpeed}
                        </span>
                      )}
                    </div>
                  </div>

                  <button type="button" onClick={handleCancel}
                    className="text-xs text-red-400 hover:text-red-600 touch-manipulation relative z-20">
                    Cancel
                  </button>
                </div>
              )}

              {/* Default empty state */}
              {!hasSelection && !isWorking && (
                <>
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-5 pointer-events-none">
                    <span className="text-slate-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </span>
                  </div>
                  <p className="font-semibold text-[#334155] mb-1 pointer-events-none">
                    Drop your file here
                  </p>
                  <p className="text-slate-500 text-sm mb-6 pointer-events-none">
                    Images, videos, documents, ZIP — any format
                  </p>

                  {/* Hidden inputs — accept all file types including iPhone photos/videos */}
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="*/*"
                  />
                  <input
                    type="file"
                    id="file-upload-camera"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*,video/*"
                    capture="environment"
                  />

                  <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                    <Button
                      type="button"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="touch-manipulation relative z-20 flex-1"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Choose File
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => document.getElementById('file-upload-camera')?.click()}
                      className="touch-manipulation relative z-20 flex-1"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Photo/Video
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* ── Shared Files ── */}
          {sharedFiles.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-1 pointer-events-none">
                Shared in this room ({sharedFiles.length})
              </h3>
              {[...sharedFiles].reverse().map((file) => {
                const isFolder = file.name.endsWith('.zip') && file.type === 'application/zip';
                return (
                  <Card key={file.id} className="p-4 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 pointer-events-none ${
                      isFolder ? 'bg-[#14B8A6]/10 text-[#14B8A6]' : 'bg-[#0EA5E9]/10 text-[#0EA5E9]'
                    }`}>
                      {isFolder ? <FolderIcon /> : <FileIcon type={file.type} />}
                    </div>
                    <div className="flex-1 min-w-0 pointer-events-none">
                      <p className="font-semibold text-[#334155] truncate text-sm">{file.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatBytes(file.size)}
                        {' · from '}
                        <span className="text-[#0EA5E9] font-medium">{file.senderName}</span>
                        {isFolder && <span className="ml-1 text-[#14B8A6]">· folder</span>}
                      </p>
                      <p className="text-[10px] text-slate-300 mt-0.5">{new Date(file.sentAt).toLocaleTimeString()}</p>
                    </div>
                    <a
                      href={downloadUrl(file.id)}
                      download={file.name}
                      className="w-10 h-10 rounded-full bg-[#0EA5E9] text-white flex items-center justify-center shadow-md hover:bg-sky-600 transition-colors touch-manipulation shrink-0 relative z-20"
                      title={`Download ${file.name}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className={`w-full lg:w-72 flex flex-col gap-5 sm:gap-6 shrink-0 ${showSidebar ? 'flex' : 'hidden'} lg:flex`}>

          {/* QR Code */}
          <Card className="p-4 sm:p-6">
            {/* Mobile: horizontal layout; Desktop: vertical */}
            <div className="flex flex-row lg:flex-col items-center gap-4 lg:gap-0">
              <div className="w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm flex items-center justify-center pointer-events-none shrink-0">
                {roomUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=176x176&margin=8&data=${encodeURIComponent(roomUrl)}`}
                    alt="QR Code"
                    width={176}
                    height={176}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 animate-pulse rounded-2xl" />
                )}
              </div>
              <div className="flex flex-col gap-1 lg:mt-3 lg:items-center">
                <p className="text-sm font-medium text-slate-600 lg:text-center pointer-events-none">Scan to join room</p>
                <p className="text-[10px] text-slate-400 break-all lg:text-center pointer-events-none">{roomUrl}</p>
                <button
                  type="button"
                  onClick={() => roomUrl && navigator.clipboard.writeText(roomUrl)}
                  className="mt-2 flex items-center gap-1.5 text-xs text-[#0EA5E9] font-medium hover:underline touch-manipulation relative z-20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy link
                </button>
              </div>
            </div>
          </Card>

          {/* Connected Devices */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5 pointer-events-none">
              <div className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
              <h3 className="font-semibold text-[#334155]">
                Connected
                <span className="ml-2 text-sm font-normal text-slate-400">({devices.length})</span>
              </h3>
            </div>
            {devices.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-4 text-slate-400 pointer-events-none">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-center">No devices yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {devices.map((device) => (
                  <div key={device.id} className="flex items-center gap-3 pointer-events-none">
                    <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 shrink-0">
                      <DeviceIcon type={device.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#334155] text-sm truncate">
                        {device.name}
                        {device.id === myId && (
                          <span className="ml-2 text-[10px] font-semibold text-[#0EA5E9] bg-[#0EA5E9]/10 px-2 py-0.5 rounded-full">You</span>
                        )}
                      </p>
                      <p className="text-xs text-[#14B8A6] font-medium">Ready</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" fullWidth onClick={handleLeave}
                className="py-2 text-sm touch-manipulation relative z-20 text-red-500 border-red-100 hover:bg-red-50 focus:ring-red-300">
                Leave Room
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
