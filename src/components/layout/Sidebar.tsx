import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '@/store';
import { getChatList, getAllTags, getPinnedChatList } from '@/lib/apis/chats';
import { getFolders } from '@/lib/apis/folders';
import { getChannels } from '@/lib/apis/channels';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { toast } from 'sonner';
import PencilSquare from '@/components/icons/PencilSquare';
import SearchIcon from '@/components/icons/SearchIcon';
import NoteIcon from '@/components/icons/NoteIcon';
import SidebarIcon from '@/components/icons/SidebarIcon';
import UserMenu from './Sidebar/UserMenu';
import ChatItem from './Sidebar/ChatItem';
import Folder from '@/components/common/Folder';
import SettingsModal from '@/components/chat/SettingsModal';

interface ChatItem {
  id: string;
  title: string;
  updated_at: number;
  created_at: number;
  time_range?: string;
  pinned?: boolean;
  folder_id?: string | null;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { id: currentChatId } = useParams();
  const {
    user,
    config,
    showSidebar,
    setShowSidebar,
    mobile,
    WEBUI_NAME,
    setShowSearch,
    showSettings,
    setShowSettings,
    chats: storeChats,
    setChats,
    pinnedChats,
    setPinnedChats,
    setTags,
    setFolders,
    folders,
    channels,
    setChannels,
    models,
    settings,
    currentChatPage,
    setCurrentChatPage,
    scrollPaginationEnabled,
    setScrollPaginationEnabled,
    temporaryChatEnabled,
    setTemporaryChatEnabled,
    selectedFolder,
    setSelectedFolder,
  } = useAppStore();

  const navRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [showPinnedChat, setShowPinnedChat] = useState(true);
  const [chatListLoading, setChatListLoading] = useState(false);
  const [allChatsLoaded, setAllChatsLoaded] = useState(false);

  const isWindows = /Windows/i.test(navigator.userAgent);

  const initChatList = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      
      // Load tags, pinned chats, and folders
      const [tagList, pinnedList, folderList] = await Promise.all([
        getAllTags(token).catch(() => []),
        getPinnedChatList(token).catch(() => []),
        getFolders(token).catch(() => []),
      ]);
      
      setTags(tagList);
      setPinnedChats(pinnedList);
      setFolders(folderList);
      
      // Reset pagination
      setCurrentChatPage(1);
      setAllChatsLoaded(false);
      
      // Load initial chats
      const chatList = await getChatList(token, 1, 50);
      setChats(chatList || []);
      
      // Enable pagination
      setScrollPaginationEnabled(true);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const initChannels = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token') || '';
      const channelList = await getChannels(token);
      setChannels(channelList || []);
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  useEffect(() => {
    // Initialize sidebar visibility
    const savedSidebar = localStorage.getItem('sidebar');
    if (!mobile && savedSidebar !== null) {
      setShowSidebar(savedSidebar === 'true');
    } else if (!mobile) {
      setShowSidebar(true);
    }
    
    // Load data
    initChatList();
    initChannels();
    
    // Load showPinnedChat preference
    const savedShowPinned = localStorage.getItem('showPinnedChat');
    if (savedShowPinned !== null) {
      setShowPinnedChat(savedShowPinned === 'true');
    }
  }, [user, mobile]);

  useEffect(() => {
    // Save sidebar state
    if (!mobile) {
      localStorage.setItem('sidebar', showSidebar.toString());
    }
  }, [showSidebar, mobile]);

  const handleNewChat = async () => {
    setSelectedFolder(null);
    
    if (user?.role !== 'admin' && user?.permissions?.chat?.temporary_enforced) {
      await setTemporaryChatEnabled(true);
    } else {
      await setTemporaryChatEnabled(false);
    }
    
    navigate('/');
    
    setTimeout(() => {
      if (mobile) {
        setShowSidebar(false);
      }
    }, 0);
  };

  const handleChatClick = (chatId: string) => {
    navigate(`/c/${chatId}`);
    if (mobile) {
      setShowSidebar(false);
    }
  };

  // Collapsed sidebar (icon-only mode)
  if (!mobile && !showSidebar) {
    return (
      <>
        <div
          className="py-2 px-1.5 flex flex-col justify-between text-black dark:text-white hover:bg-gray-50/50 dark:hover:bg-gray-950/50 h-full border-e border-gray-50 dark:border-gray-850 z-10 transition-all"
          id="sidebar"
        >
          <button
            className={`flex flex-col flex-1 ${isWindows ? 'cursor-pointer' : 'cursor-[e-resize]'}`}
            onClick={() => setShowSidebar(true)}
          >
            <div className="pb-1.5">
              <button
                className={`flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition group ${
                  isWindows ? 'cursor-pointer' : 'cursor-[e-resize]'
                }`}
                aria-label="Open Sidebar"
              >
                <div className="self-center flex items-center justify-center size-9">
                  <img
                    crossOrigin="anonymous"
                    src="/static/favicon.png"
                    className="sidebar-new-chat-icon size-6 rounded-full group-hover:hidden"
                    alt=""
                  />
                  <SidebarIcon className="size-5 hidden group-hover:flex" />
                </div>
              </button>
            </div>

            <div>
              <div>
                <a
                  className="cursor-pointer flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition group"
                  href="/"
                  draggable="false"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNewChat();
                  }}
                  aria-label="New Chat"
                >
                  <div className="self-center flex items-center justify-center size-9">
                    <PencilSquare className="size-4.5" strokeWidth="2" />
                  </div>
                </a>
              </div>

              <div>
                <button
                  className="cursor-pointer flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition group"
                  onClick={() => setShowSearch(true)}
                  draggable="false"
                  aria-label="Search"
                >
                  <div className="self-center flex items-center justify-center size-9">
                    <SearchIcon className="size-4.5" strokeWidth="2" />
                  </div>
                </button>
              </div>

              {config?.features?.enable_notes && 
               (user?.role === 'admin' || user?.permissions?.features?.notes !== false) && (
                <div>
                  <a
                    className="cursor-pointer flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition group"
                    href="/notes"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/notes');
                      if (mobile) setShowSidebar(false);
                    }}
                    draggable="false"
                    aria-label="Notes"
                  >
                    <div className="self-center flex items-center justify-center size-9">
                      <NoteIcon className="size-4.5" strokeWidth="2" />
                    </div>
                  </a>
                </div>
              )}

              {(user?.role === 'admin' || 
                user?.permissions?.workspace?.models || 
                user?.permissions?.workspace?.knowledge ||
                user?.permissions?.workspace?.prompts ||
                user?.permissions?.workspace?.tools) && (
                <div>
                  <a
                    className="cursor-pointer flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition group"
                    href="/workspace"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/workspace');
                      if (mobile) setShowSidebar(false);
                    }}
                    aria-label="Workspace"
                    draggable="false"
                  >
                    <div className="self-center flex items-center justify-center size-9">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="size-4.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z"
                        />
                      </svg>
                    </div>
                  </a>
                </div>
              )}
            </div>
          </button>

          <div>
            <div className="py-0.5">
              {user && (
                <UserMenu role={user.role}>
                  <div className="cursor-pointer flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition group">
                    <div className="self-center flex items-center justify-center size-9">
                      <img
                        src={user.profile_image_url}
                        className="size-6 object-cover rounded-full"
                        alt="User Profile"
                        aria-label="Open User Profile Menu"
                      />
                    </div>
                  </div>
                </UserMenu>
              )}
            </div>
          </div>
        </div>

        <SettingsModal
          show={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </>
    );
  }

  // Full sidebar content
  const sidebarContent = (
    <div
      ref={navRef}
      className="h-screen max-h-[100dvh] min-h-screen select-none bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-200 text-sm"
    >
      <div className="my-auto flex flex-col justify-between h-screen max-h-[100dvh] w-[260px] overflow-x-hidden">
        {/* Header */}
        <div className="sidebar px-2 pt-2 pb-1.5 flex justify-between space-x-1 text-gray-600 dark:text-gray-400 sticky top-0 z-10 -mb-3">
          <a
            className="flex items-center rounded-xl size-8.5 h-full justify-center hover:bg-gray-100/50 dark:hover:bg-gray-850/50 transition"
            href="/"
            draggable="false"
            onClick={(e) => {
              e.preventDefault();
              handleNewChat();
            }}
          >
            <img
              crossOrigin="anonymous"
              src="/static/favicon.png"
              className="sidebar-new-chat-icon size-6 rounded-full"
              alt=""
            />
          </a>

          <a 
            href="/" 
            className="flex flex-1 px-1.5"
            onClick={(e) => {
              e.preventDefault();
              handleNewChat();
            }}
          >
            <div className="self-center font-medium text-gray-850 dark:text-white font-primary">
              {WEBUI_NAME}
            </div>
          </a>

          <button
            className={`flex rounded-xl size-8.5 justify-center items-center hover:bg-gray-100/50 dark:hover:bg-gray-850/50 transition ${
              isWindows ? 'cursor-pointer' : 'cursor-[w-resize]'
            }`}
            onClick={() => setShowSidebar(false)}
            aria-label="Close Sidebar"
          >
            <div className="self-center p-1.5">
              <SidebarIcon />
            </div>
          </button>

          <div
            className={`${
              scrollTop > 0 ? 'visible' : 'invisible'
            } sidebar-bg-gradient-to-b bg-linear-to-b from-gray-50 dark:from-gray-950 to-transparent from-50% pointer-events-none absolute inset-0 -z-10 -mb-6`}
          />
        </div>

        {/* Scrollable Content */}
        <div
          className="relative flex flex-col flex-1 overflow-y-auto scrollbar-hidden pt-3 pb-3"
          onScroll={(e) => {
            const target = e.target as HTMLDivElement;
            setScrollTop(target.scrollTop);
          }}
        >
          {/* Navigation Items */}
          <div className="pb-1.5">
            <div className="px-[7px] flex justify-center text-gray-800 dark:text-gray-200">
              <a
                id="sidebar-new-chat-button"
                className="grow flex items-center space-x-3 rounded-2xl px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition outline-none"
                href="/"
                draggable="false"
                onClick={(e) => {
                  e.preventDefault();
                  handleNewChat();
                }}
                aria-label="New Chat"
              >
                <div className="self-center">
                  <PencilSquare className="size-4.5" strokeWidth="2" />
                </div>
                <div className="flex self-center translate-y-[0.5px]">
                  <div className="self-center text-sm font-primary">New Chat</div>
                </div>
              </a>
            </div>

            <div className="px-[7px] flex justify-center text-gray-800 dark:text-gray-200">
              <button
                id="sidebar-search-button"
                className="grow flex items-center space-x-3 rounded-2xl px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition outline-none"
                onClick={() => setShowSearch(true)}
                draggable="false"
                aria-label="Search"
              >
                <div className="self-center">
                  <SearchIcon strokeWidth="2" className="size-4.5" />
                </div>
                <div className="flex self-center translate-y-[0.5px]">
                  <div className="self-center text-sm font-primary">Search</div>
                </div>
              </button>
            </div>

            {config?.features?.enable_notes && 
             (user?.role === 'admin' || user?.permissions?.features?.notes !== false) && (
              <div className="px-[7px] flex justify-center text-gray-800 dark:text-gray-200">
                <a
                  id="sidebar-notes-button"
                  className="grow flex items-center space-x-3 rounded-2xl px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition"
                  href="/notes"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/notes');
                    if (mobile) setShowSidebar(false);
                  }}
                  draggable="false"
                  aria-label="Notes"
                >
                  <div className="self-center">
                    <NoteIcon className="size-4.5" strokeWidth="2" />
                  </div>
                  <div className="flex self-center translate-y-[0.5px]">
                    <div className="self-center text-sm font-primary">Notes</div>
                  </div>
                </a>
              </div>
            )}

            {(user?.role === 'admin' || 
              user?.permissions?.workspace?.models || 
              user?.permissions?.workspace?.knowledge ||
              user?.permissions?.workspace?.prompts ||
              user?.permissions?.workspace?.tools) && (
              <div className="px-[7px] flex justify-center text-gray-800 dark:text-gray-200">
                <a
                  id="sidebar-workspace-button"
                  className="grow flex items-center space-x-3 rounded-2xl px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition"
                  href="/workspace"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/workspace');
                    if (mobile) setShowSidebar(false);
                  }}
                  draggable="false"
                  aria-label="Workspace"
                >
                  <div className="self-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      className="size-4.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z"
                      />
                    </svg>
                  </div>
                  <div className="flex self-center translate-y-[0.5px]">
                    <div className="self-center text-sm font-primary">Workspace</div>
                  </div>
                </a>
              </div>
            )}
          </div>

          {/* TODO: Add Pinned Models List */}
          {/* TODO: Add Channels Section */}
          
          {/* Folders Section */}
          {folders && folders.length > 0 && (
            <Folder
              className="px-2 mt-0.5"
              name="Folders"
              chevron={false}
              onAddLabel="New Folder"
            >
              <div className="text-xs text-gray-500 dark:text-gray-500 pl-2.5 py-1">
                {folders.length} folder{folders.length !== 1 ? 's' : ''}
              </div>
            </Folder>
          )}
          
          {/* Chats Section */}
          <Folder
            className="px-2 mt-0.5"
            name="Chats"
            chevron={false}
          >
            {/* Pinned Chats */}
            {pinnedChats && pinnedChats.length > 0 && (
              <div className="mb-1">
                <div className="text-xs text-gray-500 dark:text-gray-500 font-medium pb-1.5 pl-2.5">
                  Pinned
                </div>
                <div className="ml-3 pl-1 mt-[1px] flex flex-col border-s border-gray-100 dark:border-gray-900">
                  {pinnedChats.map((chat: ChatItem) => (
                    <ChatItem
                      key={`pinned-${chat.id}`}
                      id={chat.id}
                      title={chat.title}
                      active={currentChatId === chat.id}
                      onDelete={initChatList}
                      onChange={initChatList}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Regular Chats */}
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading chats...
              </div>
            ) : !storeChats || storeChats.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No chats yet
              </div>
            ) : (
              <div className="pt-1.5">
                {storeChats.map((chat: ChatItem, idx: number) => (
                  <div key={`chat-${chat.id || idx}`}>
                    {(idx === 0 || 
                      (idx > 0 && chat.time_range !== storeChats[idx - 1].time_range)) && (
                      <div
                        className={`w-full pl-2.5 text-xs text-gray-500 dark:text-gray-500 font-medium ${
                          idx === 0 ? '' : 'pt-5'
                        } pb-1.5`}
                      >
                        {chat.time_range}
                      </div>
                    )}
                    
                    <ChatItem
                      id={chat.id}
                      title={chat.title}
                      active={currentChatId === chat.id}
                      onDelete={initChatList}
                      onChange={initChatList}
                    />
                  </div>
                ))}
              </div>
            )}
          </Folder>
        </div>

        {/* User Menu at Bottom */}
        <div className="px-1.5 pt-1.5 pb-2 sticky bottom-0 z-10 -mt-3 sidebar">
          <div className="sidebar-bg-gradient-to-t bg-linear-to-t from-gray-50 dark:from-gray-950 to-transparent from-50% pointer-events-none absolute inset-0 -z-10 -mt-6" />
          <div className="flex flex-col font-primary">
            {user && (
              <UserMenu role={user.role}>
                <div className="flex items-center rounded-2xl py-2 px-1.5 w-full hover:bg-gray-100/50 dark:hover:bg-gray-900/50 transition cursor-pointer">
                  <div className="self-center mr-3">
                    <img
                      src={user.profile_image_url}
                      className="size-6 object-cover rounded-full"
                      alt="User Profile"
                      aria-label="Open User Profile Menu"
                    />
                  </div>
                  <div className="self-center font-medium">{user.name}</div>
                </div>
              </UserMenu>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile: render as Sheet
  if (mobile) {
    return (
      <>
        {showSidebar && (
          <div
            className="fixed md:hidden z-40 top-0 right-0 left-0 bottom-0 bg-black/60 w-full min-h-screen h-screen flex justify-center overflow-hidden overscroll-contain"
            onClick={() => setShowSidebar(false)}
          />
        )}
        
        <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
          <SheetContent side="left" className="w-[280px] p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>

        <SettingsModal
          show={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </>
    );
  }

  // Desktop: render as fixed sidebar
  return (
    <>
      {showSidebar && (
        <aside className="hidden md:flex w-[280px] border-r bg-background shrink-0 fixed top-0 left-0 h-screen overflow-x-hidden z-50">
          {sidebarContent}
        </aside>
      )}

      <SettingsModal
        show={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
