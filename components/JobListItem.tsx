// components/JobListItem.tsx
import React from 'react';
import type { JobPoc } from '@/pages/api/search-jobs';

interface JobListItemProps {
  job: JobPoc;
  onSelect: (job: JobPoc) => void;
  isSelected: boolean;
}

const JobListItem: React.FC<JobListItemProps> = ({ job, onSelect, isSelected }) => {
  const handleItemClick = () => {
    onSelect(job);
  };

  return (
    <div
      onClick={handleItemClick}
      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ease-in-out transform
        ${
          isSelected 
            ? 'bg-sky-700/80 border-sky-500 ring-2 ring-sky-400 shadow-xl scale-[1.02]' // Slightly more pronounced selection
            : 'bg-slate-800 border-slate-700 hover:bg-slate-700/70 hover:border-slate-600 hover:shadow-lg hover:scale-[1.01]'
        }`}
    >
      <h3 className={`text-lg font-semibold ${isSelected ? 'text-white' : 'text-sky-400'}`}>
        {job.title}
      </h3>
      <p className={`text-sm ${isSelected ? 'text-slate-200' : 'text-slate-300'}`}>
        {job.company}
      </p>
      <p className={`text-sm ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
        {job.location}
      </p>
      {job.snippet && (
        <p className={`text-xs ${isSelected ? 'text-slate-300' : 'text-slate-400'} mt-1 leading-relaxed`}>
          {job.snippet}
        </p>
      )}
    </div>
  );
};

export default JobListItem;
