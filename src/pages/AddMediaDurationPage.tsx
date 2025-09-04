import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { MediaService } from '../services/mediaService';
import { useAuth } from '../contexts/AuthContext';

interface SelectedWeek {
  startDate: string;
  endDate: string;
  slots: number;
}

interface CampaignData {
  kiosk: any;
  selectedWeeks: SelectedWeek[];
  totalSlots: number;
  baseRate: number;
}

export default function AddMediaDurationPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: CampaignData };
  const { user } = useAuth();
  
  const campaignData = location.state;
  
  // Redirect if no campaign data or user not authenticated
  React.useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    if (!campaignData) {
      navigate('/client/new-campaign');
      return;
    }
  }, [campaignData, user, navigate]);
  
  if (!campaignData || !user) {
    return null; // Will redirect
  }
  
  const kiosk = campaignData.kiosk;
  const selectedWeeks = campaignData.selectedWeeks || [];
  const totalSlots = campaignData.totalSlots || 1;
  const baseRate = campaignData.baseRate || 40.00;

  const [slotsPerWeek, setSlotsPerWeek] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingToSupabase, setIsUploadingToSupabase] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(4 * 60 + 56); // 4:56 in seconds
  const [showConfig, setShowConfig] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [enableQRCode, setEnableQRCode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    { number: 1, name: 'Setup Service', current: false, completed: true },
    { number: 2, name: 'Select Kiosk', current: false, completed: true },
    { number: 3, name: 'Choose Weeks', current: false, completed: true },
    { number: 4, name: 'Add Media & Duration', current: true, completed: false },
    { number: 5, name: 'Review & Submit', current: false, completed: false }
  ];

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Check storage access on component mount
  useEffect(() => {
    const checkStorage = async () => {
      try {
        console.log('Checking storage access...'); // Debug log
        const accessible = await MediaService.checkStorageAccess();
        console.log('Storage accessible:', accessible); // Debug log
      } catch (error) {
        console.error('Storage check failed:', error);
      }
    };
    
    checkStorage();
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
    setUploadError(null);
    setUploadStatus('success'); // File is ready for upload when Continue is clicked
    
    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    }
  };


  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Helper function to get file dimensions without validation
  const getFileDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
          resolve({ width: 1920, height: 1080 }); // Default fallback
        };
        img.src = URL.createObjectURL(file);
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          resolve({ width: video.videoWidth, height: video.videoHeight });
        };
        video.onerror = () => {
          resolve({ width: 1920, height: 1080 }); // Default fallback
        };
        video.src = URL.createObjectURL(file);
      } else {
        resolve({ width: 1920, height: 1080 }); // Default fallback
      }
    });
  };

  // Helper function to get video duration
  const getVideoDuration = (file: File): Promise<number | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          // Convert to integer seconds for database compatibility
          resolve(Math.round(video.duration));
        };
        video.onerror = () => {
          resolve(undefined);
        };
        video.src = URL.createObjectURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const handleContinue = async () => {
    if (!uploadedFile || !user) return;

    setIsUploadingToSupabase(true);
    setUploadError(null);

    try {
      // Get actual file dimensions and duration
      const [dimensions, duration] = await Promise.all([
        getFileDimensions(uploadedFile),
        getVideoDuration(uploadedFile)
      ]);

      // Check aspect ratio (9:16 = 0.5625)
      const aspectRatio = dimensions.width / dimensions.height;
      const targetRatio = 9 / 16; // 0.5625
      
      if (Math.abs(aspectRatio - targetRatio) > 0.01) {
        throw new Error(`Aspect ratio must be 9:16 (portrait). Current: ${dimensions.width}:${dimensions.height}. Please use an image with 9:16 aspect ratio.`);
      }

      // Check resolution (must be 1080x1920 or 2160x3840)
      const isValidResolution = (
        (dimensions.width === 1080 && dimensions.height === 1920) ||
        (dimensions.width === 2160 && dimensions.height === 3840)
      );
      
      if (!isValidResolution) {
        throw new Error(`Resolution must be 1080x1920 or 2160x3840. Current: ${dimensions.width}x${dimensions.height}. Please use the correct resolution.`);
      }

      // Create validation object with actual file data
      const validation = {
        isValid: true,
        dimensions,
        duration,
        errors: []
      };

      // Upload to Supabase Storage
      const uploadedMediaAsset = await MediaService.uploadMedia(uploadedFile, validation, user.id);
      
      // Navigate to Review & Submit page with all campaign data
      navigate('/client/review-submit', {
        state: {
          ...campaignData,
          mediaFile: uploadedFile,
          slotsPerWeek,
          uploadedMediaAsset
        }
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      setIsUploadingToSupabase(false);
    }
  };

  const canContinue = uploadedFile && uploadStatus === 'success' && !isUploadingToSupabase;

  return (
    <DashboardLayout 
      title="Create New Campaign" 
      subtitle=""
      showBreadcrumb={false}
    >
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shadow-soft ${
                step.completed 
                  ? 'bg-green-600 text-white' 
                  : step.current
                  ? 'bg-black text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {step.completed ? '✓' : step.number}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                step.current ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {step.name}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-1 mx-4 ${
                  step.completed ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Back Navigation */}
      <div className="mb-8">
        <button 
          onClick={() => navigate('/client/select-weeks', { state: campaignData })}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-soft"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Choose Weeks</span>
        </button>
      </div>

      {/* Section Title */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Add Media & Duration</h2>
        <p className="text-gray-600 dark:text-gray-300">Choose your ad duration and upload media</p>
      </div>

      {/* Slot Reservation Warning */}
      <div className="mb-6 p-4 bg-yellow-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">!</span>
          </div>
          <Clock className="w-5 h-5 text-red-500" />
          <span className="text-red-800 font-medium">
            Slot Reservation Your reserved slots will expire in {formatTime(timeRemaining)}. Please complete your purchase before time runs out.
          </span>
        </div>
      </div>

      {/* Add Media & Duration Section */}
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Add Media & Duration
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Choose your ad duration and upload media
          </p>
        </div>

        {/* Ad Slot Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Ad Slot Configuration
          </h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Select Number of Ad Slots
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Each slot at {kiosk?.name || 'Metroflex Gym'} runs for 15 seconds. Base rate is ${baseRate.toFixed(2)} per slot.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Select Ad Slots For All Selected Weeks
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Slot Configuration</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Slots per week:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        value={slotsPerWeek}
                        onChange={(e) => setSlotsPerWeek(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {slotsPerWeek * 15} seconds per week
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Selected Weeks</h4>
                <div className="space-y-2">
                  {selectedWeeks.map((week, index) => (
                    <div key={index} className="text-sm text-gray-600 dark:text-gray-300">
                      Week of {new Date(week.startDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}: {week.slots} slot{week.slots > 1 ? 's' : ''}
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Total Duration: {totalSlots * 15} seconds
                  </div>
                  <div className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mt-2">
                    {selectedWeeks.length} week{selectedWeeks.length > 1 ? 's' : ''} selected
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slots Reserved Summary */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Slots reserved until:
            </span>
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {new Date(Date.now() + timeRemaining * 1000).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-yellow-700 dark:text-yellow-300">Base Rate:</span>
              <div className="font-medium text-yellow-800 dark:text-yellow-200">${baseRate.toFixed(2)} per slot</div>
            </div>
            <div>
              <span className="text-yellow-700 dark:text-yellow-300">Total Slots:</span>
              <div className="font-medium text-yellow-800 dark:text-yellow-200">{totalSlots}</div>
            </div>
            <div>
              <span className="text-yellow-700 dark:text-yellow-300">Weeks Selected:</span>
              <div className="font-medium text-yellow-800 dark:text-yellow-200">{selectedWeeks.length}</div>
            </div>
            <div>
              <span className="text-yellow-700 dark:text-yellow-300">Slots per Week:</span>
              <div className="font-medium text-yellow-800 dark:text-yellow-200">
                {selectedWeeks.map((week, index) => (
                  <div key={index}>
                    {new Date(week.startDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}: {week.slots} slot
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="text-yellow-700 dark:text-yellow-300">Total Cost:</span>
              <div className="font-medium text-yellow-800 dark:text-yellow-200">
                ${(totalSlots * baseRate).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Ad Media & Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Ad Media & Configuration
          </h3>

          {!showConfig ? (
            /* File Upload Area */
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Upload Your Ad Content
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Upload an image or video for your ad. Maximum file size: 50MB. Supported formats: JPEG, PNG, GIF, MP4, WebM, OGG. Required: 9:16 aspect ratio (portrait) with resolution 1080x1920 or 2160x3840.
                </p>
              </div>

              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  uploadedFile 
                    ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-300 hover:border-primary-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                {!uploadedFile ? (
                  <div className="space-y-4">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        JPEG, PNG, GIF, MP4, WebM, OGG up to 50MB
                      </p>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">9:16 aspect ratio required (1080x1920 or 2160x3840)</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filePreview && (
                      <div className="max-w-xs mx-auto">
                        {uploadedFile.type.startsWith('image/') ? (
                          <img 
                            src={filePreview} 
                            alt="Preview" 
                            className="w-full h-auto rounded-lg"
                          />
                        ) : (
                          <video 
                            src={filePreview} 
                            controls 
                            className="w-full h-auto rounded-lg"
                          />
                        )}
                      </div>
                    )}
                    <div>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {uploadedFile.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowConfig(true);
                      }}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Configure Ad
                    </button>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />
            </div>
          ) : (
            /* Ad Preview & Configuration Window */
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-6">Ad Preview & Configuration</h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Section - Preview */}
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-4">Preview</h5>
                  <div className="relative">
                    {/* Smartphone Frame */}
                    <div className="w-64 h-96 mx-auto bg-black rounded-[3rem] p-3 shadow-2xl">
                      <div className="w-full h-full bg-gray-900 rounded-[2.5rem] overflow-hidden relative">
                        {/* Preview Image/Video */}
                        {filePreview && (
                          <div 
                            className="w-full h-full bg-cover bg-center bg-no-repeat"
                            style={{
                              backgroundImage: `url(${filePreview})`,
                              backgroundColor: backgroundColor
                            }}
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* Remove File Button */}
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setFilePreview(null);
                        setUploadStatus('idle');
                        setUploadError(null);
                        setShowConfig(false);
                        setBackgroundColor('#000000');
                        setEnableQRCode(false);
                      }}
                      className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>Remove file</span>
                    </button>
                  </div>
                </div>

                {/* Right Section - Configuration */}
                <div className="space-y-6">
                  {/* File Information */}
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-3">File Information</h5>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div>{uploadedFile?.name}</div>
                      <div>({uploadedFile ? (uploadedFile.size / 1024 / 1024).toFixed(2) : '0'} MB)</div>
                      <div>Type: {uploadedFile?.type.startsWith('image/') ? 'Image' : 'Video'}</div>
                    </div>
                  </div>

                  {/* Background Color */}
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-3">Background Color</h5>
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded border border-gray-300"
                        style={{ backgroundColor: backgroundColor }}
                      />
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-16 h-8 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="#000000"
                      />
                    </div>
                  </div>

                  {/* QR Code Toggle */}
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-3">QR Code</h5>
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableQRCode}
                          onChange={(e) => setEnableQRCode(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          enableQRCode ? 'bg-primary-600' : 'bg-gray-300'
                        }`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            enableQRCode ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </div>
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                          Enable QR Code
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* File Status */}
                  {uploadedFile && (
                    <div className="pt-4">
                      <div className="text-green-600 flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5" />
                        <span>File ready for upload</span>
                      </div>
                    </div>
                  )}
                  
                  {uploadError && (
                    <div className="pt-4">
                      <div className="text-red-600">
                        <p>Upload failed: {uploadError}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end mt-8">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`px-6 py-3 rounded-lg shadow-soft transition-colors ${
            canContinue
              ? 'bg-gray-800 hover:bg-gray-900 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isUploadingToSupabase ? 'Uploading to Storage...' : 'Continue to Review'}
        </button>
      </div>
    </DashboardLayout>
  );
}
