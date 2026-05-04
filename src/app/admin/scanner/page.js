"use client";

import { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';

export default function AdminScanner() {
  // Capture Step (front, back, analyze, review)
  const [step, setStep] = useState('front-upload'); 
  // 'front-upload' -> 'front-crop' -> 'back-upload' -> 'back-crop' -> 'analyze' -> 'review'
  
  // Image States
  const [frontImageSrc, setFrontImageSrc] = useState(null);
  const [frontBlob, setFrontBlob] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  
  const [backImageSrc, setBackImageSrc] = useState(null);
  const [backBlob, setBackBlob] = useState(null);
  const [backPreview, setBackPreview] = useState(null);

  // Crop States (Shared)
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // AI & Submission States
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  // --- Handlers ---
  
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFrontFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFrontImageSrc(URL.createObjectURL(selected));
      setStep('front-crop');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setError('');
    }
  };

  const confirmFrontCrop = async () => {
    try {
      const croppedBlob = await getCroppedImg(frontImageSrc, croppedAreaPixels);
      setFrontBlob(croppedBlob);
      setFrontPreview(URL.createObjectURL(croppedBlob));
      setStep('back-upload'); // Move to back upload
    } catch (e) {
      setError("Failed to crop front image.");
    }
  };

  const handleBackFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setBackImageSrc(URL.createObjectURL(selected));
      setStep('back-crop');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setError('');
    }
  };

  const confirmBackCrop = async () => {
    try {
      const croppedBlob = await getCroppedImg(backImageSrc, croppedAreaPixels);
      setBackBlob(croppedBlob);
      setBackPreview(URL.createObjectURL(croppedBlob));
      setStep('analyze'); // Ready for AI
    } catch (e) {
      setError("Failed to crop back image.");
    }
  };

  const skipBackImage = () => {
    setStep('analyze');
  };

  const handleScan = async () => {
    if (!frontBlob) return;
    
    setScanning(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('image', frontBlob, 'front.jpg');
      if (backBlob) {
        formData.append('imageBack', backBlob, 'back.jpg');
      }

      const res = await fetch('/api/scan-card', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to scan card');
      }

      setScannedData({
        ...data.data,
        PriceBin: "1" // Default
      });
      
      setStep('review');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setScannedData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmitToSheet = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const uniqueId = new Date().getTime().toString() + Math.floor(Math.random() * 1000).toString();
      
      const payload = {
        ID: uniqueId,
        Name: scannedData.Name,
        Set: scannedData.Set,
        Year: scannedData.Year,
        PriceBin: parseInt(scannedData.PriceBin) || 0,
        Parallel: scannedData.Parallel || "",
        Serial: scannedData.Serial || "",
        Auto: scannedData.Auto || false,
        ImageURL: scannedData.ImageURL,
        ImageURLBack: scannedData.ImageURLBack || "",
        Approved: false,
        Sold: false
      };

      const scriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbwfY2tGS6MxYoUEqvGhJ657T0O532CW0bCeHQPujRIUcj3DRfbtees_wzqMuT6K8v7d/exec";
      
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setSuccess(`Successfully added ${scannedData.Name} to inventory!`);
      
      // Reset everything for next card
      setStep('front-upload');
      setFrontImageSrc(null);
      setFrontBlob(null);
      setFrontPreview(null);
      setBackImageSrc(null);
      setBackBlob(null);
      setBackPreview(null);
      setScannedData(null);
      if (frontInputRef.current) frontInputRef.current.value = '';
      if (backInputRef.current) backInputRef.current.value = '';

    } catch (err) {
      setError('Failed to send to Google Sheet. Details: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetProcess = () => {
    setStep('front-upload');
    setFrontImageSrc(null);
    setFrontBlob(null);
    setFrontPreview(null);
    setBackImageSrc(null);
    setBackBlob(null);
    setBackPreview(null);
    setScannedData(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12">
      <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500 opacity-50"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full"></div>
        
        <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-widest text-center flex items-center justify-center gap-3">
          AI Scanner
          {step !== 'front-upload' && (
            <button onClick={resetProcess} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 py-1 rounded-full transition-colors">
              Reset
            </button>
          )}
        </h1>
        <p className="text-slate-400 text-center mb-8 text-sm">Upload front & back photos to generate URLs and auto-extract card details.</p>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/50 text-rose-500 p-4 rounded-xl mb-6 text-sm font-medium">
            Error: {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 p-4 rounded-xl mb-6 text-sm font-medium">
            {success}
          </div>
        )}

        {/* STEP 1: Upload Front */}
        {step === 'front-upload' && (
          <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
            <h2 className="text-emerald-500 font-bold uppercase tracking-wider text-sm">Step 1: Front of Card</h2>
            
            <div className="flex gap-4 w-full max-w-sm">
              <input type="file" accept="image/*" capture="environment" onChange={handleFrontFileChange} ref={frontInputRef} className="hidden" id="frontInputCamera" />
              <label htmlFor="frontInputCamera" className="flex-1 aspect-square border-2 border-dashed border-emerald-500/50 hover:border-emerald-500 bg-emerald-500/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors group">
                <div className="text-emerald-500/70 flex flex-col items-center group-hover:text-emerald-500 p-4 text-center">
                  <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="font-bold text-sm tracking-wide">Take Photo</span>
                </div>
              </label>

              <input type="file" accept="image/*" onChange={handleFrontFileChange} className="hidden" id="frontInputGallery" />
              <label htmlFor="frontInputGallery" className="flex-1 aspect-square border-2 border-dashed border-emerald-500/50 hover:border-emerald-500 bg-emerald-500/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors group">
                <div className="text-emerald-500/70 flex flex-col items-center group-hover:text-emerald-500 p-4 text-center">
                  <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="font-bold text-sm tracking-wide">Upload Gallery</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* STEP 2: Crop Front */}
        {step === 'front-crop' && (
          <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
            <h2 className="text-amber-500 font-bold uppercase tracking-wider text-sm">Crop Front Image</h2>
            <div className="relative w-full aspect-[3/4] max-w-sm rounded-2xl overflow-hidden bg-slate-950 border border-slate-700">
              <Cropper
                image={frontImageSrc} crop={crop} zoom={zoom} aspect={3/4}
                onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom}
              />
            </div>
            <button onClick={confirmFrontCrop} className="w-full max-w-sm py-4 rounded-xl font-bold text-lg bg-emerald-500 text-slate-950">
              Confirm Front Crop
            </button>
          </div>
        )}

        {/* STEP 3: Upload Back */}
        {step === 'back-upload' && (
          <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
            <h2 className="text-emerald-500 font-bold uppercase tracking-wider text-sm">Step 2: Back of Card</h2>
            <p className="text-xs text-slate-400 text-center max-w-xs -mt-4">Providing the back photo helps the AI identify the Year & Set much more accurately!</p>
            
            <div className="flex gap-4 w-full max-w-sm">
              <input type="file" accept="image/*" capture="environment" onChange={handleBackFileChange} ref={backInputRef} className="hidden" id="backInputCamera" />
              <label htmlFor="backInputCamera" className="flex-1 aspect-square border-2 border-dashed border-amber-500/50 hover:border-amber-500 bg-amber-500/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors group">
                <div className="text-amber-500/70 flex flex-col items-center group-hover:text-amber-500 p-4 text-center">
                  <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="font-bold text-sm tracking-wide">Take Photo</span>
                </div>
              </label>

              <input type="file" accept="image/*" onChange={handleBackFileChange} className="hidden" id="backInputGallery" />
              <label htmlFor="backInputGallery" className="flex-1 aspect-square border-2 border-dashed border-amber-500/50 hover:border-amber-500 bg-amber-500/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors group">
                <div className="text-amber-500/70 flex flex-col items-center group-hover:text-amber-500 p-4 text-center">
                  <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="font-bold text-sm tracking-wide">Upload Gallery</span>
                </div>
              </label>
            </div>
            
            <button onClick={skipBackImage} className="text-slate-400 hover:text-white text-sm underline mt-2">
              Skip Back Image
            </button>
          </div>
        )}

        {/* STEP 4: Crop Back */}
        {step === 'back-crop' && (
          <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
            <h2 className="text-amber-500 font-bold uppercase tracking-wider text-sm">Crop Back Image</h2>
            <div className="relative w-full aspect-[3/4] max-w-sm rounded-2xl overflow-hidden bg-slate-950 border border-slate-700">
              <Cropper
                image={backImageSrc} crop={crop} zoom={zoom} aspect={3/4}
                onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom}
              />
            </div>
            <button onClick={confirmBackCrop} className="w-full max-w-sm py-4 rounded-xl font-bold text-lg bg-emerald-500 text-slate-950">
              Confirm Back Crop
            </button>
          </div>
        )}

        {/* STEP 5: Analyze Preview */}
        {step === 'analyze' && (
          <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-emerald-500 font-bold uppercase tracking-wider text-sm">Ready for AI</h2>
            
            <div className="flex gap-4">
              <div className="w-32 aspect-[3/4] rounded-xl overflow-hidden border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={frontPreview} alt="Front" className="w-full h-full object-cover" />
                <div className="text-center text-[10px] bg-emerald-500 text-black font-bold uppercase">Front</div>
              </div>
              
              {backPreview ? (
                <div className="w-32 aspect-[3/4] rounded-xl overflow-hidden border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={backPreview} alt="Back" className="w-full h-full object-cover" />
                  <div className="text-center text-[10px] bg-emerald-500 text-black font-bold uppercase">Back</div>
                </div>
              ) : (
                 <div className="w-32 aspect-[3/4] rounded-xl border border-slate-700 bg-slate-800 flex items-center justify-center opacity-50">
                   <span className="text-xs text-slate-500 font-medium">No Back</span>
                 </div>
              )}
            </div>
            
            <button 
              onClick={handleScan}
              disabled={scanning}
              className="w-full max-w-sm py-4 mt-4 rounded-xl font-bold text-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
            >
              {scanning ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  AI Analyzing...
                </>
              ) : (
                <>Analyze Card <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></>
              )}
            </button>
          </div>
        )}

        {/* STEP 6: Review Form */}
        {step === 'review' && scannedData && (
          <form onSubmit={handleSubmitToSheet} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-2 items-start mb-6">
              <div className="w-20 aspect-[3/4] bg-slate-800 rounded-md shrink-0 border border-slate-700 overflow-hidden shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={scannedData.ImageURL} alt="Hosted Front" className="w-full h-full object-cover" />
              </div>
              {scannedData.ImageURLBack && (
                <div className="w-20 aspect-[3/4] bg-slate-800 rounded-md shrink-0 border border-slate-700 overflow-hidden shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={scannedData.ImageURLBack} alt="Hosted Back" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 text-xs text-emerald-400 font-medium bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 ml-2">
                <svg className="w-4 h-4 mb-1 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Images successfully hosted on ImgBB.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Player Name</label>
                <input 
                  type="text" name="Name" value={scannedData.Name} onChange={handleInputChange} required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Set / Brand</label>
                  <input 
                    type="text" name="Set" value={scannedData.Set} onChange={handleInputChange} required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Year</label>
                  <input 
                    type="text" name="Year" value={scannedData.Year} onChange={handleInputChange} required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Parallel / Color</label>
                  <input 
                    type="text" name="Parallel" value={scannedData.Parallel} onChange={handleInputChange} placeholder="e.g. Silver Prizm"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-amber-400 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Serial Num</label>
                  <input 
                    type="text" name="Serial" value={scannedData.Serial} onChange={handleInputChange} placeholder="e.g. 10/99"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-amber-400 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-700"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Price Bin</label>
                  <select 
                    name="PriceBin" value={scannedData.PriceBin} onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors appearance-none"
                  >
                    <option value="1">$1 Bin</option>
                    <option value="3">$3 Bin</option>
                    <option value="5">$5 Bin</option>
                    <option value="10">$10 Bin</option>
                    <option value="20">$20 Bin</option>
                    <option value="25">Premium (Type exact price later)</option>
                  </select>
                </div>
                <div className="flex items-center justify-center bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 mt-5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="Auto" 
                      checked={scannedData.Auto} 
                      onChange={handleInputChange}
                      className="w-5 h-5 accent-emerald-500 bg-slate-900 border-slate-700 rounded"
                    />
                    <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Autograph</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8 pt-6 border-t border-slate-800">
              <button 
                type="submit" disabled={submitting}
                className="w-full py-4 rounded-xl font-bold text-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? 'Sending...' : 'Send to Inventory'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
