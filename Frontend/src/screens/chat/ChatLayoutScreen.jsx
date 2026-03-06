import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import { SERVER_URL } from "../../router";


const ChatLayoutScreen = () => {
  const [, user] = useOutletContext();
  
  const [activeTab, setActiveTab] = useState("users"); // 'users' or 'teams'
  const [users, setUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // { type: 'user'|'team', data: userObj|teamName }
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  
  // Custom Channel Modal State
  const [teams, setTeams] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Per-tab unread notification counts
  const [unreadDMs, setUnreadDMs] = useState(0);
  const [unreadTeams, setUnreadTeams] = useState(0);
  const activeChatRef = useRef(null);
  const activeTabRef = useRef("users");
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Fetch users list
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${SERVER_URL}/api/v1/chat/contacts`, { withCredentials: true });
        const fetchedUsers = res.data.data;
        setUsers(fetchedUsers);
        
        const teamsRes = await axios.get(`${SERVER_URL}/api/v1/teams`, { withCredentials: true });
        if (teamsRes.data.success) {
          setTeams(teamsRes.data.teams);
        }
        
        // Auto-select the first user if none is selected
        if (!activeChat && fetchedUsers.length > 0) {
          setActiveChat({ type: 'user', data: fetchedUsers[0] });
        }
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      }
    };
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user._id]);

  // Handle Socket Connection and Room Joining
  useEffect(() => {
    if (!user) return;

    socketRef.current = io(SERVER_URL, { withCredentials: true });
    
    // Join personal room
    socketRef.current.emit("join_room", user._id);
    
    // Listen for incoming messages
    socketRef.current.on("receive_message", (msg) => {
      const currentActiveChat = activeChatRef.current;
      const currentTab = activeTabRef.current;

      // Determine if this is a team message or a DM
      const isTeamMsg = !!msg.team;
      const isFromMe = msg.sender?._id === user._id;

      // Only append if message belongs to the currently open conversation
      setMessages((prev) => {
        if (currentActiveChat?.type === "team" && msg.team === currentActiveChat.data) {
          return [...prev, msg];
        }
        if (currentActiveChat?.type === "user") {
          const isFromActiveUser = msg.sender._id === currentActiveChat.data._id;
          const isToActiveUser = msg.receiver === currentActiveChat.data._id;
          if (isFromActiveUser || isToActiveUser) {
            return [...prev, msg];
          }
        }
        return prev;
      });

      // Increment the correct unread tab counter if the message is NOT for the current view
      if (!isFromMe) {
        if (isTeamMsg) {
          const isViewingThisTeam = currentActiveChat?.type === 'team' && currentActiveChat.data === msg.team;
          if (!isViewingThisTeam) {
            setUnreadTeams(prev => prev + 1);
          }
        } else {
          // It's a DM
          const isViewingThisDM = currentActiveChat?.type === 'user' && msg.sender?._id === currentActiveChat.data?._id;
          if (!isViewingThisDM || currentTab !== 'users') {
            setUnreadDMs(prev => prev + 1);
          }
        }
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user, activeChat]);

  // Fetch history when active chat changes
  useEffect(() => {
    if (!activeChat) return;

    const fetchHistory = async () => {
      try {
        let endpoint = `${SERVER_URL}/api/v1/chat`;
        if (activeChat.type === "user") {
          endpoint += `?userId=${activeChat.data._id}`;
        } else if (activeChat.type === "team") {
          endpoint += `?team=${activeChat.data}`;
        }
        
        const res = await axios.get(endpoint, { withCredentials: true });
        if (res.data.success) {
          setMessages(res.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      }
    };
    fetchHistory();
    
    // Join team room if team chat is opened
    if (activeChat.type === "team") {
      socketRef.current?.emit("join_room", activeChat.data);
    }
  }, [activeChat]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Keep refs in sync with state (so socket callbacks always read latest values)
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !user) return;

    const payload = {
      userId: user._id,
      text: newMessage,
    };

    if (activeChat.type === "user") {
      payload.receiverId = activeChat.data._id;
    } else if (activeChat.type === "team") {
      payload.team = activeChat.data;
    }

    socketRef.current.emit("send_message", payload);
    setNewMessage("");
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim() || selectedUsers.length === 0) return;

    try {
      const res = await axios.post(`${SERVER_URL}/api/v1/teams`, {
        name: newChannelName,
        members: selectedUsers
      }, { withCredentials: true });

      if (res.data.success) {
        setTeams(prev => [res.data.team, ...prev]);
        setIsCreateModalOpen(false);
        setNewChannelName("");
        setSelectedUsers([]);
        
        // Switch to the newly created channel
        setActiveTab("teams");
        setActiveChat({ type: 'team', data: res.data.team.name });
      }
    } catch (error) {
      console.error("Failed to create channel:", error);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <>
    <div className="flex bg-white shadow-sm rounded-lg h-[calc(100vh-90px)] border border-gray-200 overflow-hidden mx-2 mt-2 mb-2">
      
      {/* LEFT PANE - List View */}
      <div className="w-1/3 bg-gray-50 border-r border-gray-200 flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          <button
            onClick={() => { setActiveTab("users"); setUnreadDMs(0); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === "users" ? "text-teal-600 border-b-2 border-teal-600 bg-teal-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            Direct Messages
            {unreadDMs > 0 && (
              <span className="absolute top-1.5 right-3 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                {unreadDMs}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab("teams"); setUnreadTeams(0); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === "teams" ? "text-teal-600 border-b-2 border-teal-600 bg-teal-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            Team Channels
            {unreadTeams > 0 && (
              <span className="absolute top-1.5 right-3 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                {unreadTeams}
              </span>
            )}
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {activeTab === "users" && (
            <>
              {users.map(u => (
                <div key={u._id} onClick={() => setActiveChat({ type: 'user', data: u })} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${activeChat?.type === 'user' && activeChat.data._id === u._id ? 'bg-teal-100 border border-teal-200' : 'bg-white border border-gray-100 shadow-sm hover:border-teal-300'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-200 text-teal-800 flex items-center justify-center font-bold">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.role}</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </div>
              ))}
            </>
          )}

          {activeTab === "teams" && (
            <>
              {/* Create Channel Button */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full flex items-center gap-2 justify-center p-2.5 rounded-lg border border-dashed border-teal-400 text-teal-600 text-sm font-semibold hover:bg-teal-50 transition-colors mb-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Create Channel
              </button>

              {teams.length === 0 && (
                <p className="text-center text-xs text-gray-400 mt-4">No channels yet. Create one above!</p>
              )}

              {teams.map(team => (
                <div
                  key={team._id}
                  onClick={() => setActiveChat({ type: 'team', data: team.name, teamId: team._id })}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    activeChat?.type === 'team' && activeChat.data === team.name
                      ? 'bg-teal-100 border border-teal-200'
                      : 'bg-white border border-gray-100 shadow-sm hover:border-teal-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-800 text-white flex items-center justify-center font-bold text-lg">
                      #
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{team.name}</p>
                      <p className="text-xs text-gray-500">{team.members?.length || 0} members</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* RIGHT PANE - Chat Window */}
      <div className="w-2/3 bg-white flex flex-col">
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <svg className="w-24 h-24 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p className="text-lg font-medium">Select a user or team to start chatting</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm z-10">
              <div className="flex items-center gap-3">
                 {activeChat.type === 'user' ? (
                   <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold">
                     {activeChat.data.name.charAt(0).toUpperCase()}
                   </div>
                 ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-800 text-white flex items-center justify-center font-bold">
                     #
                   </div>
                 )}
                 <div>
                   <h2 className="text-lg font-bold text-gray-800">
                     {activeChat.type === 'user' ? activeChat.data.name : activeChat.data}
                   </h2>
                   <p className="text-xs text-green-500 font-medium tracking-wide uppercase">
                     {activeChat.type === 'user' ? 'Online' : 'Open Channel'}
                   </p>
                 </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex flex-col gap-4">
               {messages.length === 0 ? (
                  <div className="text-center text-gray-400 mt-auto mb-auto">This is the beginning of your chat history. Say hello! 👋</div>
               ) : (
                 messages.map((msg, index) => {
                   const isMe = msg.sender && msg.sender._id === user._id;
                   const showSenderName = activeChat?.type === 'team' || !isMe;
                   return (
                     <div key={index} className={`flex flex-col max-w-[70%] ${isMe ? "self-end items-end" : "self-start items-start"}`}>
                       {showSenderName && <span className="text-[11px] text-gray-500 ml-1 mb-1 font-semibold">{msg.sender?.name || 'Unknown User'}</span>}
                       <div className={`px-5 py-3 shadow-sm ${isMe ? "bg-teal-600 text-white rounded-2xl rounded-tr-sm" : "bg-white border text-gray-800 rounded-2xl rounded-tl-sm"}`}>
                         <p className="text-[15px]">{msg.text}</p>
                       </div>
                       <span className="text-[11px] text-gray-400 mt-1 mx-1">
                         {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </span>
                     </div>
                   );
                 })
               )}
               <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 flex gap-3 items-center">
               <input
                 type="text"
                 value={newMessage}
                 onChange={(e) => setNewMessage(e.target.value)}
                 placeholder={activeChat.type === 'user' ? `Message ${activeChat.data.name}...` : `Message #${activeChat.data}...`}
                 className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200 rounded-lg px-4 py-3 text-sm transition-all outline-none"
               />
               <button
                 type="submit"
                 disabled={!newMessage.trim()}
                 className="bg-teal-600 text-white rounded-lg px-6 py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-700 transition-colors shadow-sm"
               >
                 Send
               </button>
            </form>
          </>
        )}
      </div>

    </div>

    {/* Create Channel Modal */}
    {isCreateModalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
          {/* Modal Header */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800">Create New Channel</h2>
            <p className="text-sm text-gray-500 mt-1">Give your channel a name and add members.</p>
          </div>

          <form onSubmit={handleCreateChannel} className="flex flex-col flex-1 overflow-hidden">
            {/* Channel Name */}
            <div className="p-6 pb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Channel Name</label>
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="e.g. design-team, project-alpha"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                autoFocus
              />
            </div>

            {/* User Selection */}
            <div className="px-6 flex flex-col flex-1 overflow-hidden">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Add Members</label>
              <div className="flex-1 overflow-y-auto space-y-2 border border-gray-100 rounded-lg p-2 bg-gray-50">
                {users.map(u => (
                  <label key={u._id} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${selectedUsers.includes(u._id) ? 'bg-teal-50 border border-teal-200' : 'bg-white border border-transparent hover:border-gray-200'}`}>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u._id)}
                      onChange={() => toggleUserSelection(u._id)}
                      className="accent-teal-600 w-4 h-4"
                    />
                    <div className="w-8 h-8 rounded-full bg-teal-200 text-teal-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.role}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => { setIsCreateModalOpen(false); setNewChannelName(''); setSelectedUsers([]); }}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newChannelName.trim() || selectedUsers.length === 0}
                className="flex-1 py-2.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Channel
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>
  );
};

export default ChatLayoutScreen;
