import React from 'react';
import type { JobPoc } from '@/pages/api/search-jobs'; // Adjust path if necessary

interface JobListItemProps {
  job: JobPoc;
  onSelect: (job: JobPoc) => void;
  isSelected: boolean;
}

const JobListItem: React.FC<JobListItemProps> = ({ job, onSelect, isSelected }) => {
  const handleItemClick = () => {
    console.log('JobListItem clicked:', job.title, job.id); // <<<< DEBUG
    onSelect(job);
  };

  return (
    <div
      onClick={handleItemClick} // Make sure it calls the local handler
      className={`p-4 border rounded-lg cursor-pointer hover:shadow-lg transition-shadow ${
        isSelected ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500' : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      <h3 className="text-lg font-semibold text-indigo-700">{job.title}</h3>
      <p className="text-sm text-gray-600">{job.company}</p>
      <p className="text-sm text-gray-500">{job.location}</p>
      {job.snippet && <p className="text-xs text-gray-500 mt-1">{job.snippet}</p>}
    </div>
  );
};

export default JobListItem;
