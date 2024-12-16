import React from "react";
import { Link, useLocation } from "react-router-dom";
import { siteFooterNavigation } from "../config/footerConfig";

const Footer: React.FC = () => {
  const location = useLocation();

  // Функция для определения активного стиля
  const isActive = (path: string) =>
    location.pathname === path ? "text-blue-400" : "text-gray-300";

  return (
    <footer className="w-full bg-gray-800 py-2 fixed bottom-0 shadow-md">
      <nav className="flex justify-around text-sm">
        {siteFooterNavigation.map((el) => (
          <Link
            key={el.path}
            to={el.path}
            className={`text-center ${isActive(
              el.path,
            )} hover:text-blue-400 transition-colors duration-200`}
          >
            <el.icon className="w-5 h-5 mx-auto" />
            {el.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
};

export default Footer;
