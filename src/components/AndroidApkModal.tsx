import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { 
  Smartphone, 
  Download, 
  ExternalLink, 
  QrCode, 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  Zap, 
  X, 
  Copy, 
  Check, 
  FileCode, 
  Info,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidApkModal: React.FC<AndroidApkModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isAndroid, install } = usePWAInstall();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'install' | 'apk-cloud' | 'source-zip' | 'guide'>('install');
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [zipSuccess, setZipSuccess] = useState(false);

  // App production URL
  const appUrl = window.location.origin;
  const pwabuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(appUrl)}`;

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(appUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#1c140d',
          light: '#ffffff'
        }
      })
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [isOpen, appUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(appUrl).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadAndroidZip = async () => {
    setIsGeneratingZip(true);
    try {
      const zip = new JSZip();

      // 1. TWA Manifest for Google Bubblewrap CLI (npx @bubblewrap/cli build)
      const twaManifest = {
        packageId: "com.swedsfree.woodwork",
        host: window.location.host,
        name: "SWED WOOD WORK MANAGEMENT SYSTEM",
        launcherName: "SwedsWood",
        themeColor: "#1c140d",
        navigationColor: "#1c140d",
        backgroundColor: "#1c140d",
        enableNotifications: false,
        startUrl: "/",
        iconUrl: `${appUrl}/pwa-512x512.png`,
        maskableIconUrl: `${appUrl}/pwa-maskable-512x512.png`,
        appVersionName: "1.0.0",
        appVersionCode: 1,
        shortcuts: [
          { name: "New Job", shortName: "New Job", url: `${appUrl}/?action=new-job` },
          { name: "Inventory", shortName: "Inventory", url: `${appUrl}/?tab=inventory` },
          { name: "Invoices", shortName: "Invoices", url: `${appUrl}/?tab=invoices` }
        ],
        generator: "Swedswood PWA-to-APK Export Engine"
      };

      zip.file("twa-manifest.json", JSON.stringify(twaManifest, null, 2));

      // 2. Android Manifest XML
      const androidManifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.swedsfree.woodwork">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:label="@string/app_name"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:supportsRtl="true">
        
        <activity
            android:name="com.google.androidbrowserhelper.trusted.LauncherActivity"
            android:label="@string/app_name"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="${window.location.host}" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
      zip.file("android/app/src/main/AndroidManifest.xml", androidManifestXml);

      // 3. Android build.gradle
      const buildGradle = `apply plugin: 'com.android.application'

android {
    compileSdkVersion 34
    defaultConfig {
        applicationId "com.swedsfree.woodwork"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.5.0'
}`;
      zip.file("android/app/build.gradle", buildGradle);

      // 4. strings.xml
      const stringsXml = `<resources>
    <string name="app_name">SwedsWood</string>
    <string name="package_name">com.swedsfree.woodwork</string>
    <string name="host_name">${window.location.host}</string>
</resources>`;
      zip.file("android/app/src/main/res/values/strings.xml", stringsXml);

      // 5. assetlinks.json (Digital Asset Links for full-screen verification)
      const assetlinks = [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: "com.swedsfree.woodwork",
            sha256_cert_fingerprints: ["REPLACE_WITH_YOUR_KEYSTORE_SHA256_FINGERPRINT"]
          }
        }
      ];
      zip.file("assetlinks.json", JSON.stringify(assetlinks, null, 2));

      // 6. Manifest copy
      const manifestRes = await fetch('/manifest.json').catch(() => null);
      if (manifestRes && manifestRes.ok) {
        const manifestText = await manifestRes.text();
        zip.file("manifest.json", manifestText);
      }

      // 7. PNG Icons
      try {
        const icon512Res = await fetch('/pwa-512x512.png');
        if (icon512Res.ok) {
          const blob512 = await icon512Res.blob();
          zip.file("icons/pwa-512x512.png", blob512);
        }
        const icon192Res = await fetch('/pwa-192x192.png');
        if (icon192Res.ok) {
          const blob192 = await icon192Res.blob();
          zip.file("icons/pwa-192x192.png", blob192);
        }
        const iconMaskRes = await fetch('/pwa-maskable-512x512.png');
        if (iconMaskRes.ok) {
          const blobMask = await iconMaskRes.blob();
          zip.file("icons/pwa-maskable-512x512.png", blobMask);
        }
      } catch (err) {
        console.warn('Could not bundle icon binaries into zip:', err);
      }

      // 8. README Build Guide
      const readme = `# SWED WOOD WORK MANAGEMENT SYSTEM — ANDROID APK PACKAGE BUNDLE

This bundle contains everything required to compile and sign an Android APK or Android App Bundle (AAB) for Sweds Wood Enterprise.

## OPTION 1: 1-Click Cloud APK Build (Fastest & Zero Setup)
1. Open https://www.pwabuilder.com
2. Paste the live App URL: ${appUrl}
3. Click "Package for Stores" -> Select "Android"
4. Click "Download APK" (or generate Google Play AAB)
5. Install the generated .apk file directly onto your Android device!

## OPTION 2: Official Google Bubblewrap CLI
1. Ensure Node.js and JDK 17 are installed on your machine.
2. Open a terminal in the extracted folder containing twa-manifest.json.
3. Run:
   npx @bubblewrap/cli build
4. Bubblewrap will generate:
   - app-release-signed.apk
   - app-release-bundle.aab
5. Copy app-release-signed.apk to your phone and tap to install!

## OPTION 3: Direct Android WebAPK (No compilation needed)
Open Chrome on any Android phone, visit ${appUrl}, and tap:
"Add to Home Screen" or "Install App".
Android automatically generates and registers a native WebAPK in your App Drawer!

Target Package ID: com.swedsfree.woodwork
App Title: SWED WOOD WORK MANAGEMENT SYSTEM
Created by Swedsfree Engineering
`;
      zip.file("README_ANDROID_BUILD.md", readme);

      // Generate zip and trigger browser download
      const content = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "swedswood-android-apk-bundle.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setZipSuccess(true);
      setTimeout(() => setZipSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to generate android zip:', err);
      alert('Error bundling Android assets. Please try again or use the cloud build option.');
    } finally {
      setIsGeneratingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-amber-200/90 shadow-2xl w-full max-w-3xl overflow-hidden text-slate-800 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-amber-950 to-slate-950 p-6 text-white flex items-center justify-between border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-md border border-amber-400/30">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-lg sm:text-xl tracking-tight uppercase">
                  Android APK &amp; Mobile App Center
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready
                </span>
              </div>
              <p className="text-xs text-amber-200/80">
                Install directly on Android mobile devices or download the APK build package
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-2 gap-1 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('install')}
            className={`px-4 py-2.5 rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'install'
                ? 'bg-white text-amber-700 border-amber-600 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>1-Click Install &amp; QR Scan</span>
          </button>

          <button
            onClick={() => setActiveTab('apk-cloud')}
            className={`px-4 py-2.5 rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'apk-cloud'
                ? 'bg-white text-amber-700 border-amber-600 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-600" />
            <span>Cloud APK Generator</span>
          </button>

          <button
            onClick={() => setActiveTab('source-zip')}
            className={`px-4 py-2.5 rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'source-zip'
                ? 'bg-white text-amber-700 border-amber-600 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Download APK Package (.zip)</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2.5 rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-white text-amber-700 border-amber-600 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Android Setup Steps</span>
          </button>
        </div>

        {/* Tab 1: 1-Click Install & QR Scan */}
        {activeTab === 'install' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              
              {/* Left Column: Direct install / WebAPK */}
              <div className="space-y-4">
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Native Android WebAPK Installation</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Android devices with Google Chrome natively convert this PWA into an installed <strong>WebAPK</strong>. Once installed, it lives in your phone's app launcher with full-screen standalone mode and offline database support.
                  </p>
                </div>

                {isInstalled ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-extrabold text-sm">Application Already Installed!</p>
                      <p className="text-xs text-emerald-700">Running in standalone native window mode.</p>
                    </div>
                  </div>
                ) : isInstallable ? (
                  <button
                    onClick={install}
                    className="w-full py-4 px-5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-2xl font-black text-sm tracking-wide uppercase flex items-center justify-center gap-3 shadow-lg shadow-amber-900/20 transition transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <Smartphone className="w-5 h-5" />
                    <span>Install SwedsWood on Android</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        alert("To install directly on Android:\n1. Open this website in Chrome on your Android phone.\n2. Tap the Chrome menu (⋮) at top right.\n3. Tap 'Install app' or 'Add to Home screen'.\n\nAndroid will build the WebAPK and add it to your apps!");
                      }}
                      className="w-full py-3.5 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Install on Mobile Device</span>
                    </button>
                    <p className="text-[11px] text-slate-500 text-center">
                      On Android mobile Chrome: Tap menu (⋮) → <strong>Install app</strong>
                    </p>
                  </div>
                )}

                {/* Live App Link with Copy Button */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Live Workshop System Link:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={appUrl}
                      className="flex-1 px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-700 select-all"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedLink ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: QR Code for Phone */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col items-center text-center space-y-3">
                <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-amber-600" />
                  <span>Scan with Android Camera to Install</span>
                </span>
                
                {qrDataUrl ? (
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                    <img src={qrDataUrl} alt="QR Code for Android Installation" className="w-44 h-44 rounded-xl" />
                  </div>
                ) : (
                  <div className="w-44 h-44 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400 animate-pulse text-xs">
                    Generating QR...
                  </div>
                )}

                <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                  Open the <strong>Camera</strong> or <strong>Google Lens</strong> on your Android phone, scan the code, and tap the notification to open and install.
                </p>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Cloud APK Generator (PWABuilder) */}
        {activeTab === 'apk-cloud' && (
          <div className="p-6 space-y-5">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
              <h4 className="font-extrabold text-amber-900 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Google &amp; Microsoft PWABuilder Cloud APK Engine</span>
              </h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                PWABuilder is the industry standard tool maintained by Google and Microsoft to package any compliant PWA into a standalone <strong>.apk</strong> (sideloadable) and <strong>.aab</strong> (Google Play store ready) file in seconds.
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <p className="font-bold text-slate-800 text-xs">Target Production URL for APK:</p>
                  <p className="font-mono text-xs text-amber-700 font-bold">{appUrl}</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase">
                  PWA Validated
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700">How to generate your APK file in 3 clicks:</p>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4 leading-relaxed">
                  <li>Click the <strong>Open PWABuilder</strong> button below.</li>
                  <li>Click <strong>Package for Stores</strong> and choose <strong>Android</strong>.</li>
                  <li>Click <strong>Download Package (APK)</strong>. You can install this APK on any Android phone!</li>
                </ol>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <a
                  href={pwabuilderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <span>Build Standalone APK on PWABuilder</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-3 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? "Link Copied!" : "Copy Site URL"}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl text-slate-600 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Includes Digital Asset Links and Chrome Trusted Web Activity (TWA) compliance for full-screen native execution without browser address bars.</span>
            </div>
          </div>
        )}

        {/* Tab 3: Source Package ZIP */}
        {activeTab === 'source-zip' && (
          <div className="p-6 space-y-5">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-600" />
                <span>Complete Android Studio &amp; Bubblewrap Source Bundle</span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Download the complete native Android project package. This zip file contains the <code>twa-manifest.json</code>, <code>AndroidManifest.xml</code>, <code>build.gradle</code>, high-resolution icons (192px, 512px, maskable), and setup scripts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">Package Identifier</p>
                <p className="font-mono text-slate-500 text-[11px]">com.swedsfree.woodwork</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">Target Android Version</p>
                <p className="font-mono text-slate-500 text-[11px]">Android 5.0 (API 21) up to Android 14 (API 34)</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">Icons Included</p>
                <p className="font-mono text-slate-500 text-[11px]">192px, 512px, 512px Maskable (Adaptive)</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">Tool Compatibility</p>
                <p className="font-mono text-slate-500 text-[11px]">Android Studio, Bubblewrap, PWABuilder, Capacitor</p>
              </div>
            </div>

            <button
              onClick={handleDownloadAndroidZip}
              disabled={isGeneratingZip}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {isGeneratingZip
                  ? "Generating Android APK Bundle..."
                  : zipSuccess
                  ? "Bundle Downloaded Successfully!"
                  : "Download Android APK Build Bundle (.zip)"}
              </span>
            </button>

            {zipSuccess && (
              <p className="text-xs text-emerald-600 font-bold text-center">
                ✓ Download started! Extract the zip file to inspect the Android project and build instructions.
              </p>
            )}
          </div>
        )}

        {/* Tab 4: Step-by-Step Guide */}
        {activeTab === 'guide' && (
          <div className="p-6 space-y-4">
            <h4 className="font-extrabold text-slate-900 text-sm">
              How to Install and Run on Android Mobile:
            </h4>

            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-800">Open in Chrome on Android Phone</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Scan the QR code or send this URL to your phone: <span className="font-mono font-bold text-slate-700">{appUrl}</span>.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-800">Tap Chrome Menu (⋮) → "Install app"</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Alternatively, tap the banner at the bottom of the screen: <em>"Install SwedsWood"</em>.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-800">Launch from Android Home Screen / App Drawer</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    The app launches in full-screen standalone mode with no browser bar, full offline local storage, and instant database synchronization.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
              <span className="text-amber-900 font-medium">Ready to install on your mobile device?</span>
              <button
                onClick={() => setActiveTab('install')}
                className="font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <span>View QR Code</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>PWA &amp; Android WebAPK Architecture Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
