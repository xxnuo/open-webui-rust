import { useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { getSessionUser } from '@/lib/apis/auths';
import { getUserSettings } from '@/lib/apis/users';

const BREAKPOINT = 768;
const TOKEN_EXPIRY_BUFFER = 60; // seconds

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const socketRef = useRef<Socket | null>(null);
  const tokenTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    user,
    setUser,
    config,
    setSocket,
    setMobile,
    setIsLastActiveTab,
    setChatId,
    setSettings,
  } = useAppStore();

  // Check token expiry
  const checkTokenExpiry = async () => {
    const exp = user?.expires_at;
    const now = Math.floor(Date.now() / 1000);

    if (!exp) return;

    if (now >= exp - TOKEN_EXPIRY_BUFFER) {
      setUser(undefined);
      localStorage.removeItem('token');
      navigate('/auth');
    }
  };

  // Setup Socket.IO
  const setupSocket = async (enableWebsocket: boolean) => {
    const SOCKETIO_URL = import.meta.env.VITE_SOCKETIO_URL || `http://localhost:8080`;
    
    const _socket = io(SOCKETIO_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      path: '/socket.io',
      transports: enableWebsocket ? ['websocket'] : ['polling', 'websocket'],
      auth: { token: localStorage.getItem('token') || '' }
    });

    socketRef.current = _socket;
    setSocket(_socket);

    _socket.on('connect_error', (err) => {
      console.log('connect_error', err);
    });

    _socket.on('connect', () => {
      console.log('connected', _socket.id);
      if (localStorage.getItem('token')) {
        _socket.emit('user-join', { auth: { token: localStorage.getItem('token') } });
      } else {
        console.warn('No token found in localStorage, user-join event not emitted');
      }
    });

    _socket.on('reconnect_attempt', (attempt) => {
      console.log('reconnect_attempt', attempt);
    });

    _socket.on('reconnect_failed', () => {
      console.log('reconnect_failed');
    });

    _socket.on('disconnect', (reason, details) => {
      console.log(`Socket ${_socket.id} disconnected due to ${reason}`);
      if (details) {
        console.log('Additional details:', details);
      }
    });
  };

  // Mobile detection
  useEffect(() => {
    const onResize = () => {
      setMobile(window.innerWidth < BREAKPOINT);
    };
    
    onResize();
    window.addEventListener('resize', onResize);
    
    return () => window.removeEventListener('resize', onResize);
  }, [setMobile]);

  // Broadcast channel for tab management
  useEffect(() => {
    const bc = new BroadcastChannel('active-tab-channel');

    bc.onmessage = (event) => {
      if (event.data === 'active') {
        setIsLastActiveTab(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setIsLastActiveTab(true);
        bc.postMessage('active');
        checkTokenExpiry();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    handleVisibilityChange();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      bc.close();
    };
  }, [setIsLastActiveTab, user]);

  // Initialize socket and auth
  useEffect(() => {
    const initialize = async () => {
      if (!config) return;

      // Setup socket
      await setupSocket(config.features?.enable_websocket ?? true);

      // Check authentication
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const sessionUser = await getSessionUser(token);
          if (sessionUser) {
            setUser(sessionUser);
            
            // Load user settings
            try {
              const userSettings = await getUserSettings(token);
              if (userSettings && userSettings.ui) {
                setSettings(userSettings.ui);
              } else {
                // Fallback to localStorage if no settings from backend
                try {
                  const localSettings = JSON.parse(localStorage.getItem('settings') || '{}');
                  setSettings(localSettings);
                } catch (e) {
                  console.error('Failed to parse settings from localStorage', e);
                  setSettings({});
                }
              }
            } catch (error) {
              console.error('Failed to load user settings:', error);
              // Fallback to localStorage
              try {
                const localSettings = JSON.parse(localStorage.getItem('settings') || '{}');
                setSettings(localSettings);
              } catch (e) {
                console.error('Failed to parse settings from localStorage', e);
                setSettings({});
              }
            }
          } else {
            localStorage.removeItem('token');
            if (location.pathname !== '/auth') {
              const currentUrl = `${window.location.pathname}${window.location.search}`;
              const encodedUrl = encodeURIComponent(currentUrl);
              navigate(`/auth?redirect=${encodedUrl}`);
            }
          }
        } catch (error) {
          console.error('Auth error:', error);
          toast.error(`${error}`);
          localStorage.removeItem('token');
          if (location.pathname !== '/auth') {
            navigate('/auth');
          }
        }
      } else {
        if (location.pathname !== '/auth') {
          const currentUrl = `${window.location.pathname}${window.location.search}`;
          const encodedUrl = encodeURIComponent(currentUrl);
          navigate(`/auth?redirect=${encodedUrl}`);
        }
      }
    };

    initialize();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (tokenTimerRef.current) {
        clearInterval(tokenTimerRef.current);
      }
    };
  }, [config, setUser, setSocket, setSettings, navigate, location]);

  // Token expiry checker
  useEffect(() => {
    if (user) {
      if (tokenTimerRef.current) {
        clearInterval(tokenTimerRef.current);
      }
      tokenTimerRef.current = setInterval(checkTokenExpiry, 15000);
    }

    return () => {
      if (tokenTimerRef.current) {
        clearInterval(tokenTimerRef.current);
      }
    };
  }, [user]);

  // Extract chat ID from URL
  useEffect(() => {
    const pathParts = location.pathname.split('/');
    if (pathParts[1] === 'c' && pathParts[2]) {
      setChatId(pathParts[2]);
    } else {
      setChatId('');
    }
  }, [location, setChatId]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Outlet />
    </div>
  );
}

