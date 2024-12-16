import React from "react";

const ProfileIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
      d="M12 14l9-5-9-5-9 5 9 5zm0 0v10M9 21v-6a3 3 0 013-3h0a3 3 0 013 3v6"
    />
  </svg>
);

export default ProfileIcon;
