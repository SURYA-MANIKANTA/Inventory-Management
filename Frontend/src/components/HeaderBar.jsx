import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { SERVER_URL } from "../router";
import PropTypes from "prop-types";
import userLogo from "../assets/user-logo.svg";
import adminLogo from "../assets/admin-logo.svg";
  
function HeaderBar({ user }) {
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith("/chat")) {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    const socket = io(SERVER_URL, { withCredentials: true });
    
    // Listen for my private messages
    socket.emit("join_room", user._id);
    
    // Listen for team messages
    const DEFAULT_TEAMS = ["Engineering", "IT-Support", "HR", "Admin Group"];
    DEFAULT_TEAMS.forEach(team => socket.emit("join_room", team));

    socket.on("receive_message", (msg) => {
      // Don't show notification if we sent it ourselves
      if (msg.sender?._id === user._id) return;
      
      // Don't increment if we are currently looking at the chat page
      if (!window.location.pathname.startsWith("/chat")) {
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => socket.disconnect();
  }, [user]);

  const handleMenuClick = () => {
    setShowMenu(!showMenu);
  };

  return (
    <>
      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
          <div className="w-16 h-16 border-4 border-t-gray-400 border-b-gray-400 border-r-transparent rounded-full animate-spin"></div>
          <h2 className="text-white ml-2">Loading please wait...</h2>
        </div>
      )}
      {!isLoading && user && (
        <header className="fixed top-0 right-0 left-0 z-20">
          <div className="px-6 h-14 bg-white shadow-md flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              Inventory Management
            </h1>
            
            <div className="flex items-center gap-6">
              {/* Chat Button */}
              <Link 
                to="/chat"
                className="relative flex items-center gap-2 bg-[#f0fdf9] text-[#0f766e] px-4 py-1.5 rounded-full font-semibold hover:bg-[#ccfbf1] transition-colors shadow-sm border border-[#99f6e4] whitespace-nowrap"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                <span className="text-sm">Let&apos;s Chat</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </Link>

              {/* User Profile Area */}
              <div className="flex items-center pl-6 border-l border-gray-200">
                <img
                  src={user.role === "user" ? userLogo : adminLogo}
                  alt="User Logo"
                  className="h-8 w-8 rounded-full border-2 border-green-500 bg-green-100 p-0.5 object-cover"
                />
                <div className="ml-3 flex flex-col justify-center">
                  <h3 className="text-[15px] text-gray-900 font-bold leading-tight max-w-[200px] truncate">
                    {user.name}
                  </h3>
                  <span className="text-[11px] text-gray-500 leading-tight truncate">{user.email}</span>
                </div>
              </div>
              
              <button
                className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                onClick={handleMenuClick}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16m-7 6h7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </header>
      )}
    </>
  );
}

HeaderBar.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string,
    role: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
  }),
};

export default HeaderBar;
