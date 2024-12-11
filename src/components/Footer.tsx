import React from "react";
import { Link, useLocation } from "react-router-dom";

const Footer: React.FC = () => {
    const location = useLocation();

    // Активный стиль для текущей страницы
    const isActive = (path: string) =>
        location.pathname === path ? "text-blue-400" : "text-gray-300";

    return (
        <footer className="w-full bg-gray-800 py-2 fixed bottom-0 shadow-md">
            <nav className="flex justify-around text-sm">
                <Link
                    to="/balance"
                    className={`text-center ${isActive(
                        "/balance"
                    )} hover:text-blue-400 transition-colors duration-200`}
                >
                    <svg
                        className="w-5 h-5 mx-auto"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M3 10h11M9 21V3m4 6h8M7 7h14"
                        />
                    </svg>
                    Balance
                </Link>
                <Link
                    to="/game"
                    className={`text-center ${isActive(
                        "/game"
                    )} hover:text-blue-400 transition-colors duration-200`}
                >
                    <svg
                        className="w-5 h-5 mx-auto"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 12h3l-4 5H9l4-5h3zm-4-9v5H9m2 7v3H7v-5h3m6-9h5l-3 5h-3V3z"
                        />
                    </svg>
                    Game
                </Link>
                <Link
                    to="/profile"
                    className={`text-center ${isActive(
                        "/profile"
                    )} hover:text-blue-400 transition-colors duration-200`}
                >
                    <svg
                        className="w-5 h-5 mx-auto"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 14l9-5-9-5-9 5 9 5zm0 0v10M9 21v-6a3 3 0 013-3h0a3 3 0 013 3v6"
                        />
                    </svg>
                    Profile
                </Link>
            </nav>
        </footer>
    );
};

export default Footer;
