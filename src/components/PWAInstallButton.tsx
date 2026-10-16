import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle2, ChevronRight } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AndroidApkModal } from './AndroidApkModal';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'settings';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isAndroid, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // When rendered in settings
  if (variant === 'settings') {
    return (
      <>
        <div className="bg-amber-50/70 p-5 rounded-3xl border border-amber-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-950 font-black text-xs uppercase tracking-wider">
              <Smartphone className="w-4 h-4 text-amber-600" />
              <span>Android APK &amp; Mobile App Installation</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
              isInstalled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-200/80 text-amber-900'
            }`}>
              {isInstalled ? 'Installed' : 'Ready'}
            </span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Install this workshop system directly onto Android phones with an app icon on the home screen, full-screen standalone window, and offline caching.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-extrabold text-xs transition cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Open Android APK Center</span>
            </button>
            {isInstallable && (
              <button
                onClick={install}
                className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>1-Click Install</span>
              </button>
            )}
          </div>
        </div>
        <AndroidApkModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  // Header quick launcher button
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer group"
        title="Android APK & Mobile App Installation"
      >
        <Smartphone className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-amber-200" />
        <span className="hidden sm:inline">Android APK</span>
        <span className="sm:hidden">APK</span>
      </button>

      <AndroidApkModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
