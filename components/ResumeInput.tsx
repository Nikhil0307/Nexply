// components/ResumeInput.tsx
import React, { useState, useCallback, useRef } from 'react';

interface ResumeInputProps {
  resumeText: string;
  setResumeText: (text: string) => void;
  setIsParsingResume?: (isParsing: boolean) => void;
  setResumeParseError?: (error: string | null) => void;
}

const ResumeInput: React.FC<ResumeInputProps> = ({
  resumeText,
  setResumeText,
  setIsParsingResume,
  setResumeParseError,
}) => {
  const [showTextArea, setShowTextArea] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFileWithApi = async (file: File | null | undefined) => {
    if (!file) return;

    setIsParsingResume?.(true);
    setResumeParseError?.(null);
    setResumeText(''); // Clear existing text when new file is processed
    setFileName(null); // Clear old file name

    const formData = new FormData();
    formData.append('resumeFile', file);

    try {
      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setResumeText(data.text);
      setFileName(data.fileName);
      setShowTextArea(true); 
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process resume file.';
      setResumeParseError?.(message);
      setFileName(null);
    } finally {
      setIsParsingResume?.(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await processFileWithApi(event.target.files?.[0]);
  };

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-sky-500', 'bg-slate-700/30'); // Use consistent hover state removal
    await processFileWithApi(event.dataTransfer.files?.[0]);
  }, [processFileWithApi]); // Added processFileWithApi as dependency

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    event.currentTarget.classList.add('border-sky-500', 'bg-slate-700/30'); // Consistent hover state
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-sky-500', 'bg-slate-700/30'); // Consistent hover state removal
  };

  const toggleTextArea = () => {
    setShowTextArea(!showTextArea);
  };

  return (
    <div className="p-4 sm:p-6 bg-slate-800 shadow-xl rounded-lg">
      <label htmlFor="resume-upload" className="block text-sm font-medium text-slate-300 mb-2">
        Upload or Paste Your Resume
      </label>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className="mb-4 p-6 border-2 border-dashed border-slate-600 rounded-lg text-center cursor-pointer hover:border-sky-500 hover:bg-slate-700/30 transition-colors duration-150"
      >
        <input
          type="file"
          id="resume-upload"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,text/plain,.txt"
        />
        {/* Placeholder Icon (replace with actual SVG icon component) */}
        {!fileName && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto h-12 w-12 text-slate-500 mb-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
        )}
        {fileName ? (
          <p className="text-sm text-slate-300">File: <span className="font-medium text-sky-400">{fileName}</span></p>
        ) : (
          <p className="text-sm text-slate-400">
            Drag & drop (PDF, DOCX, TXT) or click to select.
          </p>
        )}
      </div>

      <div className="relative text-center mb-4">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-700" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-800 px-2 text-sm text-slate-500">OR</span>
        </div>
      </div>

      <button
        onClick={toggleTextArea}
        className="w-full mb-3 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 transition-colors duration-150"
      >
        {showTextArea ? 'Hide Manual Input' : 'Type or Paste Resume Content'}
      </button>

      {showTextArea && (
        <div>
          <label htmlFor="resume-text" className="sr-only">Resume Text</label>
          <textarea
            id="resume-text"
            rows={10}
            className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            placeholder="Paste your full resume text here..."
            value={resumeText}
            onChange={(e) => {
              setResumeText(e.target.value);
              if (e.target.value && fileName) setFileName(null); // Clear filename if user types manually
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ResumeInput;
