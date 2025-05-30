import React from 'react';
import JobListItem from './JobListItem';
import type { JobPoc } from '@/pages/api/search-jobs'; // Adjust path

interface JobListProps {
  jobs: JobPoc[];
  selectedJobId: string | null;
  onJobSelect: (job: JobPoc) => void; // This is the prop received from HomePage
}

const JobList: React.FC<JobListProps> = ({ jobs, selectedJobId, onJobSelect }) => {
  if (jobs.length === 0) {
    return <p className="text-gray-500 p-4 text-center">No jobs found for your criteria.</p>;
  }
  // console.log("JobList received onJobSelect:", typeof onJobSelect); // <<<< Optional DEBUG

  return (
    <div className="space-y-3 p-1 max-h-[600px] overflow-y-auto">
      {jobs.map((job) => (
        <JobListItem
          key={job.id}
          job={job}
          onSelect={onJobSelect} // Pass the received onJobSelect to JobListItem's onSelect
          isSelected={job.id === selectedJobId}
        />
      ))}
    </div>
  );
};

export default JobList;
