import React from "react";

const GameIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12h3l-4 5H9l4-5h3zm-4-9v5H9m2 7v3H7v-5h3m6-9h5l-3 5h-3V3z"
    />
  </svg>
);

export default GameIcon;
