const GeometricPattern = () => (
  <svg
    className="absolute inset-0 w-full h-full opacity-[0.04]"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 400 400"
    preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      <pattern id="islamic-geo" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
        {/* 8-pointed star pattern */}
        <polygon
          points="50,5 61,34 95,34 68,54 79,84 50,66 21,84 32,54 5,34 39,34"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
        />
        <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="0.3" />
        <circle cx="0" cy="0" r="15" fill="none" stroke="currentColor" strokeWidth="0.3" />
        <circle cx="100" cy="0" r="15" fill="none" stroke="currentColor" strokeWidth="0.3" />
        <circle cx="0" cy="100" r="15" fill="none" stroke="currentColor" strokeWidth="0.3" />
        <circle cx="100" cy="100" r="15" fill="none" stroke="currentColor" strokeWidth="0.3" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.2" />
        <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.2" />
      </pattern>
    </defs>
    <rect width="400" height="400" fill="url(#islamic-geo)" />
  </svg>
);

export default GeometricPattern;
