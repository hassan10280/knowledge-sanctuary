import { motion } from "framer-motion";

const GeometricPattern = () => (
  <>
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.06]"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="islamic-geo" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
          <polygon
            points="50,5 61,34 95,34 68,54 79,84 50,66 21,84 32,54 5,34 39,34"
            fill="none"
            stroke="white"
            strokeWidth="0.5"
          />
          <circle cx="50" cy="50" r="20" fill="none" stroke="white" strokeWidth="0.3" />
          <circle cx="0" cy="0" r="15" fill="none" stroke="white" strokeWidth="0.3" />
          <circle cx="100" cy="0" r="15" fill="none" stroke="white" strokeWidth="0.3" />
          <circle cx="0" cy="100" r="15" fill="none" stroke="white" strokeWidth="0.3" />
          <circle cx="100" cy="100" r="15" fill="none" stroke="white" strokeWidth="0.3" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeWidth="0.15" />
          <line x1="50" y1="0" x2="50" y2="100" stroke="white" strokeWidth="0.15" />
        </pattern>
      </defs>
      <rect width="400" height="400" fill="url(#islamic-geo)" />
    </svg>
    {/* Floating geometric accents */}
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
      className="absolute top-1/4 right-[10%] w-40 h-40 border border-white/[0.06] rounded-full"
    />
    <motion.div
      animate={{ rotate: -360 }}
      transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
      className="absolute bottom-1/3 left-[8%] w-60 h-60 border border-white/[0.04] rounded-full"
    />
  </>
);

export default GeometricPattern;
