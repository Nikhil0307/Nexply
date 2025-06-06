// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // We can add custom dark theme colors here if needed,
      // but we'll primarily use Tailwind's built-in dark variants.
      colors: {
        'brand-dark-bg': '#111827', // Example: Rich dark blue/gray
        'brand-surface': '#1F2937', // Example: Slightly lighter surface
        'brand-accent': '#38bdf8',  // Example: Sky blue accent (sky-400)
        'brand-accent-hover': '#0ea5e9', // Sky-500
        'brand-muted': '#9ca3af',   // Gray-400 for muted text
        'brand-subtle': '#6b7280',  // Gray-500
      }
    },
  },
  plugins: [
    // Ensure this is removed or use a v4 compatible version if you specifically need it.
    // For now, let's assume v4's base styles are enough.
    // require('@tailwindcss/forms'), 
  ],
};
