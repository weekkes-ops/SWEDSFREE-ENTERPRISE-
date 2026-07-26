import React, { useState, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Image as ImageIcon, 
  FileText, 
  Plus, 
  Search, 
  UploadCloud, 
  User, 
  Briefcase,
  Check,
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Employee, Job, DailyWorkLog } from '../types';

interface DailyWorkManagerProps {
  employees: Employee[];
  jobs: Job[];
  workLogs: DailyWorkLog[];
  onAddWorkLog: (log: Omit<DailyWorkLog, 'id'>) => void;
  currentUser?: Employee | null;
}

const PRESET_IMAGES = [
  {
    name: 'Fine Sanding',
    url: 'https://images.unsplash.com/photo-1534081333815-ae5019106622?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Joint Assembly',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Raw Board Cuts',
    url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Gloss Lacquer',
    url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
  }
];

const LOCATION_PRESETS = [
  'Main Woodshop (Bay A)',
  'Main Woodshop (Bay B)',
  'Client Site (East Legon)',
  'Client Site (Airport Residential)',
  'Off-site Warehouse'
];

export default function DailyWorkManager({ 
  employees, 
  jobs, 
  workLogs, 
  onAddWorkLog,
  currentUser
}: DailyWorkManagerProps) {
  
  const isAuditor = currentUser?.role === 'Auditor';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArtisanFilter, setSelectedArtisanFilter] = useState('All');
  
  // Form State
  const [employeeId, setEmployeeId] = useState(currentUser && currentUser.role !== 'Manager' && currentUser.role !== 'Admin' ? currentUser.id : '');
  const [jobId, setJobId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeStarted, setTimeStarted] = useState('08:00');
  const [timeEnd, setTimeEnd] = useState('17:00');
  const [location, setLocation] = useState('');
  const [comment, setComment] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');
  
  // Keep form employeeId locked if currentUser is not Manager or Admin
  React.useEffect(() => {
    if (currentUser && currentUser.role !== 'Manager' && currentUser.role !== 'Admin') {
      setEmployeeId(currentUser.id);
    }
  }, [currentUser, isModalOpen]);
  
  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter logs
  const filteredLogs = workLogs.filter(log => {
    const matchesSearch = log.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.jobTitle && log.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          log.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesArtisan = selectedArtisanFilter === 'All' || log.employeeId === selectedArtisanFilter;
    
    return matchesSearch && matchesArtisan;
  });

  // Handle Drag Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImagePreview(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset form
  const resetForm = () => {
    setEmployeeId(currentUser && currentUser.role !== 'Manager' && currentUser.role !== 'Admin' ? currentUser.id : '');
    setJobId('');
    setDate(new Date().toISOString().split('T')[0]);
    setTimeStarted('08:00');
    setTimeEnd('17:00');
    setLocation('');
    setComment('');
    setImagePreview('');
  };

  // Handle Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeId) {
      alert('Please select an Artisan.');
      return;
    }
    if (!location) {
      alert('Please specify the location.');
      return;
    }
    if (!comment || comment.trim().length < 10) {
      alert('Please add a descriptive comment of at least 10 characters.');
      return;
    }
    
    const selectedEmployee = employees.find(emp => emp.id === employeeId);
    const selectedJob = jobs.find(jb => jb.id === jobId);
    
    onAddWorkLog({
      employeeId,
      employeeName: selectedEmployee ? selectedEmployee.name : 'Unknown Artisan',
      jobId: jobId || undefined,
      jobTitle: selectedJob ? selectedJob.title : undefined,
      date,
      timeStarted,
      timeEnd,
      location,
      comment,
      pictureUrl: imagePreview || PRESET_IMAGES[0].url // Default to first preset if empty
    });
    
    setIsModalOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6" id="daily-work-logs-view">
      {/* Title & Actions Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-white tracking-tight">Daily Work Logs</h1>
          <p className="text-sm text-slate-400 mt-1">
            Artisans upload end-of-day progress photos, timestamps, active locations, and task details.
          </p>
        </div>
        
        {!isAuditor && (
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="px-5 py-3 bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 rounded-xl flex items-center gap-2 transition duration-200 shadow-[0_4px_14px_0_rgba(245,158,11,0.25)] hover:shadow-[0_4px_20px_0_rgba(245,158,11,0.4)]"
            id="btn-upload-work"
          >
            <Plus className="w-5 h-5" />
            <span>Upload Daily Work</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search work logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/40 border border-white/10 text-slate-100 rounded-xl text-sm focus:outline-none"
            id="search-work-logs"
          />
        </div>

        <div>
          <select
            value={selectedArtisanFilter}
            onChange={(e) => setSelectedArtisanFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900/40 border border-white/10 text-slate-100 rounded-xl text-sm focus:outline-none"
            id="filter-artisan"
          >
            <option value="All">All Artisans</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-xs px-2 justify-end">
          <Filter className="w-4 h-4 text-amber-500" />
          <span>Showing <strong>{filteredLogs.length}</strong> of <strong>{workLogs.length}</strong> logs</span>
        </div>
      </div>

      {/* Logs Grid */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl">
          <ImageIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">No logs match your filters</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords, switching the artisan filter, or upload a new work log.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="work-logs-grid">
          {filteredLogs.map((log) => {
            const associatedJob = jobs.find(j => j.id === log.jobId);
            return (
              <div 
                key={log.id}
                className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex flex-col hover:border-white/20 transition duration-300 shadow-lg hover:shadow-xl"
                id={`work-log-${log.id}`}
              >
                {/* Image Section */}
                <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                  <img 
                    src={log.pictureUrl || 'https://images.unsplash.com/photo-1534081333815-ae5019106622?auto=format&fit=crop&w=600&q=80'} 
                    alt="Woodwork status"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent"></div>
                  
                  {/* Badge */}
                  <span className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md border border-white/10 text-amber-400 text-[10px] uppercase font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
                    <Clock className="w-3 h-3 text-amber-500" />
                    <span>{log.timeStarted} - {log.timeEnd}</span>
                  </span>
                </div>

                {/* Content Section */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Artisan */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xs text-amber-400 font-bold">
                        {log.employeeName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-100">{log.employeeName}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{log.date}</span>
                        </p>
                      </div>
                    </div>

                    {/* Metadata Detail Row */}
                    <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs text-slate-300">
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{log.location}</span>
                      </p>
                      {log.jobTitle && (
                        <p className="flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="font-semibold text-slate-200 truncate">Job: {log.jobTitle}</span>
                        </p>
                      )}
                    </div>

                    {/* Comment text */}
                    <p className="text-xs text-slate-400 italic leading-relaxed pt-1">
                      "{log.comment}"
                    </p>
                  </div>

                  {/* Footer status link */}
                  {associatedJob && (
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 uppercase tracking-wider font-semibold">Active Status</span>
                      <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full font-bold uppercase">
                        {associatedJob.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Frosted Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" id="upload-modal">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/25">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Daily Work Log Upload</h2>
                  <p className="text-xs text-slate-400">Complete your evening submission with verified woodcraft progress.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Artisan select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Artisan Name *</label>
                  {currentUser && currentUser.role !== 'Manager' && currentUser.role !== 'Admin' ? (
                    <div className="w-full px-3.5 py-2.5 bg-slate-950/30 border border-white/5 rounded-xl text-sm text-slate-400 font-bold select-none">
                      {currentUser.name} ({currentUser.role})
                    </div>
                  ) : (
                    <select
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl text-sm focus:outline-none"
                      id="form-employee-id"
                    >
                      <option value="">-- Choose Employee --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Associated Job (optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Associated Job (Optional)</label>
                  <select
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl text-sm focus:outline-none"
                    id="form-job-id"
                  >
                    <option value="">-- No linked job --</option>
                    {jobs.map(jb => (
                      <option key={jb.id} value={jb.id}>{jb.title} (Client: {jb.customerName})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Submission Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl text-sm focus:outline-none"
                    id="form-date"
                  />
                </div>

                {/* Time Started */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Time Started *</label>
                  <input
                    type="time"
                    required
                    value={timeStarted}
                    onChange={(e) => setTimeStarted(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl text-sm focus:outline-none"
                    id="form-time-started"
                  />
                </div>

                {/* Time End */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Time Finished *</label>
                  <input
                    type="time"
                    required
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl text-sm focus:outline-none"
                    id="form-time-end"
                  />
                </div>
              </div>

              {/* Work Location with Quick presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Work Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Woodshop (Bay A) or Client address"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl text-sm focus:outline-none"
                  id="form-location"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {LOCATION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLocation(preset)}
                      className="px-2.5 py-1 bg-white/5 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/20 text-[10px] text-slate-400 hover:text-amber-400 rounded-full transition"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Picture Upload Zone (Supports Drag & Drop) */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 block">Upload Progress Photo *</label>
                
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 ${
                    isDragging 
                      ? 'border-amber-500 bg-amber-500/5' 
                      : 'border-white/15 bg-slate-950/30 hover:bg-slate-950/50 hover:border-white/25'
                  }`}
                  id="drag-drop-zone"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  {imagePreview ? (
                    <div className="relative w-full max-w-xs h-32 rounded-xl overflow-hidden shadow border border-white/10">
                      <img 
                        src={imagePreview} 
                        alt="Progress preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImagePreview('');
                        }}
                        className="absolute top-1.5 right-1.5 bg-slate-950/80 hover:bg-red-500 hover:text-white p-1 rounded-full text-xs text-slate-300 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-10 h-10 text-slate-500" />
                      <p className="text-xs font-semibold text-slate-300">Drag & drop photo here or <span className="text-amber-400 hover:underline">browse files</span></p>
                      <p className="text-[10px] text-slate-500">Supports JPEG, PNG, WEBP high-resolution photos</p>
                    </>
                  )}
                </div>

                {/* Preset quick selection */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Or Select Standard Woodwork Preset Photo:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setImagePreview(preset.url)}
                        className={`relative group h-14 rounded-lg overflow-hidden border transition ${
                          imagePreview === preset.url 
                            ? 'border-amber-500 shadow-md shadow-amber-500/10 scale-95' 
                            : 'border-white/10 hover:border-white/25'
                        }`}
                        title={preset.name}
                      >
                        <img 
                          src={preset.url} 
                          alt={preset.name} 
                          className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition"
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white bg-slate-950/40 text-center px-1">
                          {preset.name}
                        </span>
                        {imagePreview === preset.url && (
                          <div className="absolute top-1 right-1 bg-amber-500 rounded-full p-0.5 text-slate-950 text-[6px]">
                            <Check className="w-1.5 h-1.5 stroke-[4]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Achievements Comment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">End-of-day Progress Comment *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail exactly what woodwork tasks were accomplished (sanding, joinery, carving, coating applied, hardware fitted etc.)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl text-xs focus:outline-none leading-relaxed"
                  id="form-comment"
                />
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-amber-500/10 flex items-center gap-1.5"
                  id="btn-submit-work-log"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Verify & Submit Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
