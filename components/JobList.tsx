// components/JobList.tsx
import React from 'react';
import JobListItem from './JobListItem';
import type { JobPoc } from '@/pages/api/search-jobs';

interface JobListProps {
  jobs: JobPoc[];
  selectedJobId: string | null;
  onJobSelect: (job: JobPoc) => void;
}

const JobList: React.FC<JobListProps> = ({ jobs, selectedJobId, onJobSelect }) => {
  if (jobs.length === 0) {
    // This specific message is better handled in index.tsx now, 
    // but returning null or an empty fragment is also an option here.
    return <p className="text-slate-400 p-4 text-center">No jobs found for your criteria.</p>;
  }

  return (
    <div className="space-y-3 p-2 md:p-3 max-h-[500px] overflow-y-auto"> {/* Scrollbar styles from globals.css will apply */}
      {jobs.map((job) => (
        <JobListItem
          key={job.id}
          job={job}
          onSelect={onJobSelect}
          isSelected={job.id === selectedJobId}
        />
      ))}
    </div>
  );
};

export default JobList;
