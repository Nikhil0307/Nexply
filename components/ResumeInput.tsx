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
    setResumeText('');
    setFileName(null);

    const formData = new FormData();
    formData.append('resumeFile', file); // Key 'resumeFile' matches what API route expects

    try {
      const response = await fetch('/api/parse-resume', { // API call
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
      setShowTextArea(true); // Show textarea with parsed content
    } catch (error) {
      console.error('Error uploading or parsing resume file:', error);
      const message = error instanceof Error ? error.message : 'Failed to process resume file.';
      setResumeParseError?.(message);
      setFileName(null);
    } finally {
      setIsParsingResume?.(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
      }
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await processFileWithApi(event.target.files?.[0]);
  };

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-indigo-600', 'bg-indigo-50');
    await processFileWithApi(event.dataTransfer.files?.[0]);
  }, []); // No dependencies needed if processFileWithApi doesn't rely on changing props/state directly from here

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    event.currentTarget.classList.add('border-indigo-600', 'bg-indigo-50');
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-indigo-600', 'bg-indigo-50');
  };

  const toggleTextArea = () => {
    setShowTextArea(!showTextArea);
    if (showTextArea && resumeText) {
        // If hiding textarea and there's text, user might want to clear filename
        // or indicate that the text area content is now the source of truth.
        // setFileName(null); // Optional: clear filename if hiding and text exists
    }
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <label htmlFor="resume-upload" className="block text-sm font-medium text-gray-700 mb-2">
        Upload or Paste Your Resume
      </label>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className="mb-4 p-6 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-indigo-500 transition-colors"
      >
        <input
          type="file"
          id="resume-upload"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,text/plain,.txt"
        />
        {fileName ? (
          <p className="text-sm text-gray-700">File: {fileName}</p>
        ) : (
          <p className="text-sm text-gray-500">
            Drag & drop (PDF, DOCX, TXT) or click to select.
          </p>
        )}
      </div>

      <div className="text-center mb-4">
        <span className="text-sm text-gray-500">OR</span>
      </div>

      <button
        onClick={toggleTextArea}
        className="w-full mb-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        {showTextArea ? 'Hide Manual Input' : 'Type or Paste Resume Content'}
      </button>

      {showTextArea && (
        <div>
          <label htmlFor="resume-text" className="sr-only">Resume Text</label>
          <textarea
            id="resume-text"
            rows={10}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
