import React from "react";
import Footer from "./Footer";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <div className="flex-grow">{children}</div>
      <Footer />
    </div>
  );
};

export default Layout;
