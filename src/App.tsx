import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Image as ImageIcon, 
  LogOut, 
  User as UserIcon, 
  Menu, 
  X, 
  Trash2, 
  Globe,
  Moon,
  Sun,
  Settings,
  ArrowRight,
  Sparkles,
  Camera,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@supabase/supabase-js';
import { Chat, Message } from './types';
import { generateChatResponse, generateImage, editImage } from './services/gemini';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TypingIndicator = () => (
  <div className="flex gap-1 px-1 py-2">
    <motion.div
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
      className="w-1.5 h-1.5 bg-zinc-400 rounded-full"
    />
    <motion.div
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
      className="w-1.5 h-1.5 bg-zinc-400 rounded-full"
    />
    <motion.div
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
      className="w-1.5 h-1.5 bg-zinc-400 rounded-full"
    />
  </div>
);

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchChats(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchChats(session.user.id);
      } else {
        setUser(null);
        setChats([]);
        setCurrentChat(null);
        setMessages([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  useEffect(() => {
    if (currentChat && user) {
      fetchMessages(currentChat.id);
    } else if (!user && !currentChat) {
      setMessages([]);
    }
  }, [currentChat, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChats = async (userId: string) => {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });
    
    if (data) setChats(data);
  };

  const fetchMessages = async (chatId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chatId', chatId)
      .order('createdAt', { ascending: true });
    
    if (data) setMessages(data);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (authMode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) setError(error.message);
      else alert('Check your email for confirmation!');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const createNewChat = async () => {
    if (!user) {
      setCurrentChat(null);
      setMessages([]);
      setIsSidebarOpen(false);
      return;
    }
    const id = Math.random().toString(36).substring(7);
    const title = 'New Conversation';
    
    const { error } = await supabase
      .from('chats')
      .insert([{ id, userId: user.id, title }]);

    if (!error) {
      const newChat = { id, userId: user.id, title, createdAt: new Date().toISOString() };
      setChats([newChat, ...chats]);
      setCurrentChat(newChat);
      setIsSidebarOpen(false);
    }
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    await supabase.from('messages').delete().eq('chatId', chatId);
    const { error } = await supabase.from('chats').delete().eq('id', chatId);
    
    if (!error) {
      setChats(chats.filter(c => c.id !== chatId));
      if (currentChat?.id === chatId) setCurrentChat(null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    let chatToUse = currentChat;
    if (user && !chatToUse) {
      const id = Math.random().toString(36).substring(7);
      const title = input.trim().substring(0, 30) || 'Image Chat';
      
      await supabase
        .from('chats')
        .insert([{ id, userId: user.id, title }]);
        
      chatToUse = { id, userId: user.id, title, createdAt: new Date().toISOString() };
      setChats([chatToUse, ...chats]);
      setCurrentChat(chatToUse);
    }

    const userMessage: Message = {
      chatId: chatToUse?.id || 'guest',
      role: 'user',
      content: selectedImage || input,
      type: selectedImage ? 'image' : 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (user && chatToUse) {
        await supabase.from('messages').insert([userMessage]);
      }

      let aiResponse: string | null = '';
      let responseType: 'text' | 'image' = 'text';

      const lowerInput = input.toLowerCase();
      const imageKeywords = ['generate', 'create', 'draw', 'make', 'show', 'render', 'design'];
      const imageTypes = ['image', 'picture', 'photo', 'painting', 'sketch', 'illustration', 'art', 'drawing'];
      
      const isImageGen = imageKeywords.some(k => lowerInput.includes(k)) && imageTypes.some(t => lowerInput.includes(t));
      const isImageEdit = selectedImage && (lowerInput.includes('edit') || lowerInput.includes('change') || lowerInput.includes('add') || lowerInput.includes('remove') || lowerInput.includes('filter') || lowerInput.includes('style'));

      if (isImageGen) {
        setIsLoading(true); // Ensure loading is true
        // Optional: You could set a specific loading text here if you weren't using the dots
        aiResponse = await generateImage(input);
        responseType = 'image';
      } else if (isImageEdit) {
        aiResponse = await editImage(selectedImage, input);
        responseType = 'image';
      } else {
        const history = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.type === 'image' ? '[Image Content]' : m.content }]
        }));
        aiResponse = await generateChatResponse(input, history);
      }

      if (aiResponse) {
        const aiMessage: Message = {
          chatId: chatToUse?.id || 'guest',
          role: 'model',
          content: aiResponse,
          type: responseType
        };
        setMessages(prev => [...prev, aiMessage]);
        
        if (user && chatToUse) {
          await supabase.from('messages').insert([aiMessage]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setSelectedImage(null);
    }
  };

  const AuthModal = () => (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-[100]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl relative shadow-2xl"
      >
        <button 
          onClick={() => setIsAuthOpen(false)}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
            <Sparkles className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-display font-bold text-zinc-900 dark:text-white">
            {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-center">
            {authMode === 'login' 
              ? 'Sign in to continue your conversations' 
              : 'Join GreatX to experience the future of AI'}
          </p>
        </div>

        {/* Toggle Tabs */}
        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-6">
          <button
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              authMode === 'login' 
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              authMode === 'register' 
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              placeholder="name@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</p>}
          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
          >
            {authMode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsAuthOpen(false)}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            Continue as Guest
          </button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      {isAuthOpen && <AuthModal />}
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 z-50 transform transition-transform lg:relative lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Sparkles className="text-white w-5 h-5" />
              </div>
              <span className="font-display font-bold text-xl text-zinc-900 dark:text-white">GreatX</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-zinc-500 dark:text-zinc-400">
              <X size={20} />
            </button>
          </div>

          <button
            onClick={createNewChat}
            className="flex items-center gap-2 w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white p-3 rounded-xl transition-colors mb-6"
          >
            <Plus size={20} />
            <span className="font-medium">New Chat</span>
          </button>

          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
            {user ? (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    setCurrentChat(chat);
                    setIsSidebarOpen(false);
                  }}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    currentChat?.id === chat.id 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium' 
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <MessageSquare size={18} />
                    <span className="truncate text-sm">{chat.title}</span>
                  </div>
                  <button
                    onClick={(e) => deleteChat(chat.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-4 text-center">
                <p className="text-xs text-zinc-500 mb-3">Sign in to save your chat history</p>
                <button 
                  onClick={() => setIsAuthOpen(true)}
                  className="text-xs font-semibold text-emerald-500 hover:text-emerald-400"
                >
                  Sign In Now
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 w-full p-3 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              <span className="text-sm font-medium">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>

            {user ? (
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                    <UserIcon size={16} className="text-zinc-500 dark:text-zinc-400" />
                  </div>
                  <span className="text-sm font-medium truncate max-w-[120px] text-zinc-700 dark:text-zinc-200">{user.email}</span>
                </div>
                <button onClick={handleLogout} className="text-zinc-400 hover:text-red-500 transition-colors">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-2 w-full p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <UserIcon size={18} />
                <span className="text-sm font-medium">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 lg:px-8 bg-white/80 dark:bg-zinc-950/50 backdrop-blur-md sticky top-0 z-30 transition-colors">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-zinc-500 dark:text-zinc-400">
              <Menu size={24} />
            </button>
            <h2 className="font-display font-semibold text-lg truncate text-zinc-900 dark:text-white">
              {currentChat ? currentChat.title : 'Welcome to GreatX'}
            </h2>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 scrollbar-hide">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-6"
              >
                <Sparkles className="text-emerald-500 w-10 h-10" />
              </motion.div>
              <h3 className="text-3xl font-display font-bold mb-4 text-zinc-900 dark:text-white">How can I help you today?</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8">
                I can help you write code, generate stunning images, translate languages, or just have a friendly conversation.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {[
                  { icon: ImageIcon, text: "Generate a futuristic city", prompt: "Generate image of a futuristic cyberpunk city" },
                  { icon: Globe, text: "Translate 'Hello' to Japanese", prompt: "How do you say 'Hello' in Japanese?" },
                  { icon: MessageSquare, text: "Write a short story", prompt: "Write a 2-paragraph sci-fi story" },
                  { icon: Sparkles, text: "Explain quantum physics", prompt: "Explain quantum physics simply" }
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(item.prompt)}
                    className="flex items-center gap-3 p-4 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-left transition-all group shadow-sm hover:shadow-md"
                  >
                    <item.icon className="text-emerald-500 w-5 h-5" />
                    <span className="text-sm text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{item.text}</span>
                    <ChevronRight className="ml-auto w-4 h-4 text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] lg:max-w-[70%] rounded-2xl p-4 ${
                msg.role === 'user' 
                  ? 'bg-emerald-500 text-white rounded-tr-none shadow-md shadow-emerald-500/10' 
                  : 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-tl-none border border-zinc-200 dark:border-zinc-800 shadow-sm'
              }`}>
                {msg.type === 'image' ? (
                  <img 
                    src={msg.content} 
                    alt="AI Generated" 
                    className="rounded-lg w-full h-auto shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <p className="text-sm lg:text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
                <div className={`text-[10px] mt-2 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl rounded-tl-none p-4 shadow-sm">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 lg:p-8 bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent dark:from-zinc-950 dark:via-zinc-950 dark:to-transparent">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto">
            {selectedImage && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative inline-block mb-4"
              >
                <img src={selectedImage} alt="Selected" className="h-24 w-24 object-cover rounded-xl border-2 border-emerald-500" />
                <button 
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
            <div className="chat-input-container">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-400 hover:text-emerald-500 transition-colors"
              >
                <Camera size={22} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e as any);
                  }
                }}
                placeholder="Ask GreatX anything..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 py-3 px-2 resize-none max-h-32 min-h-[44px] scrollbar-hide"
                rows={1}
              />
              <button
                type="submit"
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className={`p-3 rounded-xl transition-all ${
                  (!input.trim() && !selectedImage) || isLoading
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600'
                    : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95'
                }`}
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
