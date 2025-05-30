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
        .then(() => alert(`${title} copied to clipboard!`))
        .catch(err => console.error('Failed to copy text: ', err));
    }
  };
  
  return (
    <div className="p-4 bg-white shadow-md rounded-lg min-h-[200px]">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
        {content && !isLoading && (
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-100 rounded hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Copy
          </button>
        )}
      </div>
      {isLoading && <p className="text-gray-500 animate-pulse">Generating {title.toLowerCase()}...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!isLoading && !error && content && (
        <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 p-3 rounded max-h-96 overflow-y-auto">
          {content}
        </pre>
      )}
      {!isLoading && !error && !content && <p className="text-gray-400">No content generated yet.</p>}
    </div>
  );
};

export default GeneratedContentDisplay;
