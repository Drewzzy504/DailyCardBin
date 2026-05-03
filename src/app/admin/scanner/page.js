"use client";

import { useState, useRef } from 'react';

export default function AdminScanner() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setScannedData(null);
      setError('');
      setSuccess('');
    }
  };

  // Send to our local API for Gemini + ImgBB
  const handleScan = async () => {
    if (!file) return;
    
    setScanning(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/scan-card', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to scan card');
      }

      // Pre-fill the form with AI data and default PriceBin
      setScannedData({
        ...data.data,
        PriceBin: "1" // Default
      });
      
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  // Handle changes to the pre-filled form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setScannedData(prev => ({ ...prev, [name]: value }));
  };

  // Submit the final verified data to Google Apps Script
  const handleSubmitToSheet = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Create a unique ID
      const uniqueId = new Date().getTime().toString() + Math.floor(Math.random() * 1000).toString();
      
      const payload = {
        ID: uniqueId,
        Name: scannedData.Name,
        Set: scannedData.Set,
        Year: scannedData.Year,
        PriceBin: parseInt(scannedData.PriceBin),
        ImageURL: scannedData.ImageURL,
        Approved: false, // Default to false so admin can review in sheet if needed, or we can make it true
        Sold: false
      };

      // We need the Apps Script URL from env or hardcoded fallback
      const scriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbwfY2tGS6MxYoUEqvGhJ657T0O532CW0bCeHQPujRIUcj3DRfbtees_wzqMuT6K8v7d/exec";
      
      // Since Google Apps Script blocks CORS on simple POSTs from browser, 
      // we must use 'no-cors' mode, which means we can't read the response JSON,
      // but it will successfully execute the script.
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      setSuccess(`Successfully added ${scannedData.Name} to inventory!`);
      // Reset form
      setFile(null);
      setPreview('');
      setScannedData(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (err) {
      setError('Failed to send to Google Sheet. Make sure your Apps Script has the new doPost function. Details: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12">
      <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500 opacity-50"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full"></div>
        
        <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-widest text-center">AI Card Scanner</h1>
        <p className="text-slate-400 text-center mb-8 text-sm">Take a photo to automatically identify the card and generate an ImageURL.</p>

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

        {/* Step 1: Upload / Preview */}
        {!scannedData && (
          <div className="flex flex-col items-center gap-6">
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden" 
              id="cameraInput"
            />
            
            <label 
              htmlFor="cameraInput" 
              className="w-full aspect-[3/4] max-w-sm border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-800/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden group"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              ) : (
                <div className="text-slate-500 flex flex-col items-center">
                  <svg className="w-12 h-12 mb-2 opacity-50 group-hover:opacity-100 group-hover:text-emerald-500 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium tracking-wide">Tap to Open Camera</span>
                </div>
              )}
            </label>

            {preview && (
              <button 
                onClick={handleScan}
                disabled={scanning}
                className="w-full max-w-sm py-4 rounded-xl font-bold text-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {scanning ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    AI Analyzing...
                  </>
                ) : (
                  <>
                    Analyze Card
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Step 2: Review Form */}
        {scannedData && (
          <form onSubmit={handleSubmitToSheet} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-4 items-start mb-6">
              <div className="w-24 h-32 bg-slate-800 rounded-lg shrink-0 border border-slate-700 overflow-hidden shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={scannedData.ImageURL} alt="Hosted" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 text-sm text-emerald-400 font-medium bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                <svg className="w-5 h-5 mb-1 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Image successfully hosted on ImgBB. URL ready for Google Sheets.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Player Name</label>
                <input 
                  type="text" 
                  name="Name" 
                  value={scannedData.Name} 
                  onChange={handleInputChange}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Set / Brand</label>
                  <input 
                    type="text" 
                    name="Set" 
                    value={scannedData.Set} 
                    onChange={handleInputChange}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Year</label>
                  <input 
                    type="text" 
                    name="Year" 
                    value={scannedData.Year} 
                    onChange={handleInputChange}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Price Bin</label>
                <select 
                  name="PriceBin" 
                  value={scannedData.PriceBin} 
                  onChange={handleInputChange}
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
            </div>

            <div className="flex gap-4 mt-8 pt-6 border-t border-slate-800">
              <button 
                type="button"
                onClick={() => setScannedData(null)}
                className="flex-1 py-4 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={submitting}
                className="flex-[2] py-4 rounded-xl font-bold text-lg bg-amber-500 hover:bg-amber-400 text-slate-900 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
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
