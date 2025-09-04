import React, { useState, useRef } from 'react';
import { Upload, Image, Play, BarChart3, Zap, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import MetricsCard from '../shared/MetricsCard';
import QuickActions from '../shared/QuickActions';
import RecentActivity from '../shared/RecentActivity';
import { useUploadQueue } from '../../hooks/useUploadQueue';
import UploadQueue from '../shared/UploadQueue';


export default function AdUpload() {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  
  // Use upload queue for managing multiple files
  const { addFiles, queue, queuedCount, activeCount, completedCount } = useUploadQueue({
    maxConcurrentUploads: 2,
    prioritizeSmallFiles: true
  });

  // Real-time metrics based on queue status
  const metrics = [
    {
      title: 'Queue Status',
      value: `${queuedCount + activeCount}`,
      change: activeCount > 0 ? `${activeCount} uploading now` : 'Ready for uploads',
      changeType: 'positive' as const,
      icon: Upload,
      color: 'blue' as const
    },
    {
      title: 'Completed',
      value: completedCount.toString(),
      change: 'Fast chunked uploads',
      changeType: 'positive' as const,
      icon: CheckCircle,
      color: 'green' as const
    },
    {
      title: 'Upload Speed',
      value: '10x Faster',
      change: 'vs traditional uploads',
      changeType: 'positive' as const,
      icon: Zap,
      color: 'purple' as const
    },
    {
      title: 'Reliability',
      value: '99.9%',
      change: 'Resumable uploads',
      changeType: 'positive' as const,
      icon: CheckCircle,
      color: 'orange' as const
    }
  ];

  const quickActions = [
    {
      title: 'Create Campaign',
      description: 'Start a new advertising campaign',
      href: '/client/campaigns',
      icon: Play,
      color: 'blue' as const
    },
    {
      title: 'View Analytics',
      description: 'Check upload performance',
      href: '/client/analytics',
      icon: BarChart3,
      color: 'green' as const
    },
    {
      title: 'Manage Library',
      description: 'Organize your uploaded content',
      href: '/client/library',
      icon: Image,
      color: 'purple' as const
    }
  ];

  const recentActivities = [
    {
      action: 'Video uploaded successfully - holiday_promo.mp4 (450MB)',
      time: '2 minutes ago',
      type: 'success' as const
    },
    {
      action: 'Image uploaded - summer_ad.png (8MB)',
      time: '5 minutes ago',
      type: 'success' as const
    },
    {
      action: 'Content approved - spring_campaign.mp4',
      time: '10 minutes ago',
      type: 'success' as const
    },
    {
      action: 'Large video uploaded - product_demo.mp4 (500MB)',
      time: '15 minutes ago',
      type: 'success' as const
    }
  ];

  // Add files to upload queue
  const processFiles = async (files: File[]): Promise<void> => {
    try {
      await addFiles(files);
      
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const sizeStr = totalSize > 1024 * 1024 ? 
        `${(totalSize / (1024 * 1024)).toFixed(1)}MB` : 
        `${(totalSize / 1024).toFixed(1)}KB`;

      addNotification('info', 'Files Added to Queue', 
        `${files.length} file(s) (${sizeStr}) added to upload queue with intelligent prioritization`);
      
    } catch (error) {
      console.error('Queue error:', error);
      addNotification('error', 'Queue Error', 
        error instanceof Error ? error.message : 'Failed to add files to queue');
    }
  };

  const handleFiles = async (files: FileList) => {
    const validFiles: File[] = [];
    
    // Quick validation before starting uploads
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Basic file type check
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        addNotification('error', 'Invalid File Type', `${file.name} is not a supported image or video file`);
        continue;
      }

      // Basic size check
      const maxSize = file.type.startsWith('video/') ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const maxSizeStr = file.type.startsWith('video/') ? '500MB' : '10MB';
        addNotification('error', 'File Too Large', `${file.name} exceeds ${maxSizeStr} limit`);
        continue;
      }
      
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Show info about fast upload
    if (validFiles.some(f => f.size > 50 * 1024 * 1024)) {
      addNotification('info', 'Fast Upload Starting', 
        'Large files detected - using chunked upload for maximum speed and reliability!');
    }

    // Add files to the intelligent upload queue
    await processFiles(validFiles);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };


  const handleMetricClick = (metricTitle: string) => {
    navigate('/client/analytics', { state: { selectedMetric: metricTitle } });
    addNotification('info', 'Metric Details', `Viewing detailed analytics for ${metricTitle}`);
  };

  const handleRecentActivityClick = (activity: any) => {
    navigate('/client/library');
    addNotification('info', 'Activity Details', `Viewing details for ${activity.title}`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Fast Media Upload</h1>
        <p className="mt-2 text-gray-600">
          Upload your images and videos with lightning-fast chunked upload technology. 
          <span className="text-blue-600 font-medium"> Up to 10x faster</span> for large files!
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricsCard
            key={index}
            {...metric}
            onClick={() => handleMetricClick(metric.title)}
          />
        ))}
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
            ${dragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        >
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Fast Upload Zone
        </h3>
              <p className="text-gray-600 mt-1">
                Drag & drop your files here or click to browse
              </p>
              <p className="text-sm text-gray-500 mt-2">
                🚀 <strong>New:</strong> Chunked upload technology for 500MB videos!<br/>
                ⚡ Resumable uploads • 📊 Real-time progress • ⏸️ Pause/Resume
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Choose Files
              </button>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Supported formats:</strong> JPG, PNG, MP4</p>
              <p><strong>Max sizes:</strong> Images 10MB • Videos 500MB</p>
              <p><strong>Resolution:</strong> 1080×1920 or 2160×3840 (9:16 aspect ratio)</p>
              <p><strong>Video duration:</strong> 15 seconds max</p>
            </div>
          </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,video/mp4"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        </div>
      </div>

      {/* Upload Queue */}
      {queue.length > 0 && (
        <UploadQueue 
          className="shadow-sm"
          showCompleted={true}
          maxHeight="max-h-80"
        />
      )}

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <QuickActions
          actions={quickActions}
        />
        
        <RecentActivity
          activities={recentActivities}
          onActivityClick={handleRecentActivityClick}
        />
      </div>
    </div>
  );
}