import { useState, useRef } from 'react';
import { Upload, X, FileImage, File } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function MockupUploader({ mockups = [], onChange }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const uploadFile = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const newMockup = { url: file_url, name: file.name, type: file.type };
    onChange([...mockups, newMockup]);
    setUploading(false);
    toast.success('Mockup uploaded!');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const remove = (idx) => onChange(mockups.filter((_, i) => i !== idx));

  const isImage = (type) => type?.startsWith('image/');

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Attach Mockup</p>

      {/* Uploaded mockups */}
      {mockups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mockups.map((m, i) => (
            <div key={i} className="relative group border rounded-lg overflow-hidden bg-slate-50">
              {isImage(m.type) ? (
                <img src={m.url} alt={m.name} className="w-20 h-20 object-cover" />
              ) : (
                <div className="w-20 h-20 flex flex-col items-center justify-center gap-1 p-2">
                  <File className="w-6 h-6 text-blue-500" />
                  <span className="text-xs text-slate-500 text-center leading-tight truncate w-full">{m.name}</span>
                </div>
              )}
              <button
                onClick={() => remove(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {m.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg px-4 py-3 text-center cursor-pointer transition-colors ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
        }`}
      >
        {uploading ? (
          <p className="text-xs text-blue-500">Uploading...</p>
        ) : (
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Upload className="w-4 h-4" />
            <span className="text-xs">Drop file or click to upload (image or PDF)</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={e => e.target.files[0] && uploadFile(e.target.files[0])}
        />
      </div>
    </div>
  );
}