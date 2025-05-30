// components/JobSearchForm.tsx
import React, { useState, useEffect } from 'react';

interface JobSearchFormProps {
  onSearch: (keywords: string, location: string, skills: string) => void;
  isLoading: boolean;
  initialKeywords?: string;
  initialLocation?: string;
  initialSkills?: string;
  setExternalKeywords?: (keywords: string) => void; 
  setExternalLocation?: (location: string) => void; 
  setExternalSkills?: (skills: string) => void;    
}

const JobSearchForm: React.FC<JobSearchFormProps> = ({
  onSearch,
  isLoading,
  initialKeywords = '',
  initialLocation = '',
  initialSkills = '',
  setExternalKeywords,
  setExternalLocation,
  setExternalSkills,
}) => {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [location, setLocation] = useState(initialLocation);
  const [skills, setSkills] = useState(initialSkills);

  useEffect(() => { setKeywords(initialKeywords); }, [initialKeywords]);
  useEffect(() => { setLocation(initialLocation); }, [initialLocation]);
  useEffect(() => { setSkills(initialSkills); }, [initialSkills]);

  const handleKeywordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeywords(e.target.value);
    setExternalKeywords?.(e.target.value);
  };
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocation(e.target.value);
    setExternalLocation?.(e.target.value);
  };
  const handleSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSkills(e.target.value);
    setExternalSkills?.(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(keywords, location, skills);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white shadow-md rounded-lg">
      <div>
        <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">
          Keywords (Job Title, Company)
        </label>
        <input
          type="text"
          id="keywords"
          value={keywords}
          onChange={handleKeywordsChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., Software Engineer, Google"
          required
        />
      </div>
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          type="text"
          id="location"
          value={location}
          onChange={handleLocationChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., San Francisco, CA or Remote"
          required
        />
      </div>
      <div>
        <label htmlFor="skills" className="block text-sm font-medium text-gray-700">
          Skills (comma-separated)
        </label>
        <input
          type="text"
          id="skills"
          value={skills}
          onChange={handleSkillsChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., React, Node.js, Python"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
      >
        {isLoading ? 'Searching...' : 'Search Jobs'}
      </button>
    </form>
  );
};

export default JobSearchForm;
