// components/GeneratedContentDisplay.tsx
import React from 'react';

interface GeneratedContentDisplayProps {
  title: string;
  content: string | null;
  isLoading: boolean;
  error: string | null;
}

const GeneratedContentDisplay: React.FC<GeneratedContentDisplayProps> = ({ title, content, isLoading, error }) => {
  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content)
        .then(() => alert(`${title} copied to clipboard!`)) // Consider a less obtrusive notification system later
        .catch(err => console.error('Failed to copy text: ', err));
    }
  };
  
  return (
    <div className="p-4 sm:p-5 bg-slate-800 shadow-xl rounded-lg min-h-[180px] flex flex-col"> 
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
        {content && !isLoading && (
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-xs font-medium text-sky-300 bg-sky-700/60 rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 ring-offset-2 ring-offset-slate-800 focus:ring-sky-500 transition-colors duration-150"
          >
            Copy
          </button>
        )}
      </div>
      {isLoading && <p className="text-slate-400 animate-pulse mt-1">Generating {title.toLowerCase()}...</p>}
      {error && <p className="text-red-400 mt-1">Error: {error}</p>}
      {!isLoading && !error && content && (
        <pre className="flex-grow whitespace-pre-wrap text-sm text-slate-200 bg-slate-900 p-3 rounded-md max-h-96 overflow-y-auto mt-1 shadow-inner">
          {content}
        </pre>
      )}
      {!isLoading && !error && !content && <p className="text-slate-500 mt-1">No content generated yet.</p>}
    </div>
  );
};

export default GeneratedContentDisplay;
