import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LogOut, Plus, ArrowUp, User, Loader2, Menu, X, Mic, Paperclip, ChevronDown, Sparkles, MessageSquare, FileUp, Globe, BrainCircuit, Trash2 } from 'lucide-react';
import appIcon from '../assets/icon.png';

export default function Chat() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [provider, setProvider] = useState('openai');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [threads, setThreads] = useState([]);
    const [activeThreadId, setActiveThreadId] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchMode, setSearchMode] = useState(false);
    const scrollRef = useRef(null);
    const fileInputRef = useRef(null);

    const token = localStorage.getItem('token');

    // Load threads on mount
    useEffect(() => {
        loadThreads();
    }, []);

    const loadThreads = async () => {
        try {
            if (!token) return;
            const data = await api.getThreads(token);
            setThreads(data.threads || []);
        } catch (err) {
            console.error("Failed to load threads", err);
        }
    };

    const loadThreadHistory = async (threadId) => {
        setLoading(true);
        setActiveThreadId(threadId);
        setSidebarOpen(false); // Close sidebar on mobile selection
        try {
            console.log("Loading history for thread:", threadId);
            const data = await api.getThreadHistory(threadId, token);
            console.log("API Response:", data);

            // Transform backend message format to frontend format
            // Expected Backend: { chats: [{ query: "...", response: "..." }] }
            // Handling fallbacks for: [{ query: "...", response: "..." }]

            let chats = [];
            if (data.chats && Array.isArray(data.chats)) {
                chats = data.chats;
            } else if (Array.isArray(data)) {
                chats = data;
            } else {
                console.warn("Unexpected chat history format:", data);
            }

            console.log("Processing chats:", chats.length);

            const history = [];
            chats.forEach(chat => {
                // Ensure we handle potential field naming variations if necessary
                const userContent = chat.query || chat.user_message || chat.prompt || "";
                const aiContent = chat.response || chat.ai_message || chat.result || "";

                if (userContent) {
                    history.push({ role: 'user', content: userContent });
                }
                if (aiContent) {
                    history.push({ role: 'assistant', content: aiContent });
                }
            });

            setMessages(history);
        } catch (err) {
            console.error("Failed to load history", err);
            setMessages([{ role: 'error', content: 'Failed to load chat history.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const scrollToBottom = () => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const currentInput = input;
        const userMessage = { role: 'user', content: currentInput };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        // Handle Web Search Mode
        if (searchMode) {
            try {
                // Optimistic "Searching" message
                const searchMsgId = Date.now();
                setMessages(prev => [...prev, { role: 'assistant', content: 'Searching the web...', id: searchMsgId }]);

                const result = await api.webSearch(currentInput, token);

                setMessages(prev => prev.map(msg =>
                    msg.id === searchMsgId ? { ...msg, content: result.answer || "No results found." } : msg
                ));
            } catch (err) {
                console.error("Search failed", err);
                setMessages(prev => [...prev, { role: 'error', content: 'Web search failed.' }]);
            } finally {
                setLoading(false);
                setSearchMode(false); // Reset mode after search
            }
            return;
        }

        let currentThreadId = activeThreadId;

        try {
            // If no active thread, create one first
            if (!currentThreadId) {
                // Use first 30 chars of prompt as title
                const title = currentInput.substring(0, 30) + (currentInput.length > 30 ? '...' : '');
                const newChat = await api.createChat(title, token);
                currentThreadId = newChat.id;
                setActiveThreadId(currentThreadId);
                // Refresh threads list
                await loadThreads();
            }

            const aiMessageId = Date.now();
            // Optimistic AI message
            setMessages(prev => [...prev, { role: 'assistant', content: '', id: aiMessageId }]);

            let currentContent = '';
            await api.chat(
                userMessage.content,
                currentThreadId,
                provider,
                token,
                (chunk) => {
                    currentContent += chunk;
                    setMessages(prev => prev.map(msg =>
                        msg.id === aiMessageId ? { ...msg, content: currentContent } : msg
                    ));
                },
                (error) => {
                    console.error(error);
                    setMessages(prev => [...prev, { role: 'error', content: 'Error: Failed to get response.' }]);
                },
                () => {
                    setLoading(false);
                }
            );
        } catch (err) {
            console.error("Request failed", err);
            setMessages(prev => [...prev, { role: 'error', content: 'Error: Request failed.' }]);
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        let targetThreadId = activeThreadId;

        // If no active thread and we are uploading, we might need to create one first?
        // Or we can just let it fail if no thread?
        // The API requires a thread_id.
        // If we are in "Home State", we don't have a thread ID yet.
        // We should probably create a new chat if uploading on home screen.

        setLoading(true);
        try {
            if (!targetThreadId) {
                const newChat = await api.createChat("New Chat (File)", token);
                targetThreadId = newChat.id;
                setActiveThreadId(targetThreadId);
                await loadThreads();
            }

            // Optimistic message
            const uploadMsgId = Date.now();
            setMessages(prev => [...prev, { role: 'user', content: `Uploading file: ${file.name}...` }]);

            const response = await api.uploadFile(targetThreadId, file, token);

            setMessages(prev => [...prev, { role: 'assistant', content: `File uploaded successfully: ${file.name}` }]);

        } catch (err) {
            console.error("File upload failed", err);
            setMessages(prev => [...prev, { role: 'error', content: `Failed to upload file: ${err.message}` }]);
        } finally {
            setLoading(false);
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const handleOptionSelect = (option) => {
        setIsMenuOpen(false);
        if (option === 'webSearch') {
            setSearchMode(true);
            // Optionally focus input
        } else if (option === 'upload') {
            fileInputRef.current?.click();
        } else if (option === 'thinking') {
            // Placeholder for thinking mode
            alert("Thinking mode enabled (simulation)");
        }
    };

    const startNewChat = () => {
        setMessages([]);
        setActiveThreadId(null);
        setSidebarOpen(false);
    };

    const handleDeleteThread = async (e, threadId) => {
        e.stopPropagation(); // Prevent triggering loadThreadHistory
        if (!confirm('Are you sure you want to delete this chat?')) return;

        try {
            await api.deleteThread(threadId, token);
            setThreads(prev => prev.filter(t => t.id !== threadId));
            if (activeThreadId === threadId) {
                startNewChat();
            }
        } catch (err) {
            console.error("Failed to delete thread", err);
            alert("Failed to delete thread");
        }
    };

    // Shared Input Component
    // This was previously defined here but moved outside to prevent re-renders causing focus loss


    return (
        <div className="app-container">
            {/* Sidebar Overlay for Mobile */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
                        <X className="w-5 h-5" />
                    </button>
                    <button onClick={startNewChat} className="new-chat-btn">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ background: 'transparent', padding: '0.125rem' }}>
                                <img src={appIcon} alt="New Chat" style={{ width: '1.25rem', height: '1.25rem', objectFit: 'contain' }} />
                            </div>
                            New Chat
                        </span>
                        <Plus className="w-4 h-4 text-text-secondary" />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }} className="scrollbar-thin">
                    <div className="sidebar-section-title">History</div>
                    {threads.map(thread => (
                        <div
                            key={thread.id}
                            className={`history-item ${activeThreadId === thread.id ? 'active' : ''}`}
                            onClick={() => loadThreadHistory(thread.id)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {thread.title}
                            </span>
                            <button
                                onClick={(e) => handleDeleteThread(e, thread.id)}
                                className="delete-btn"
                                title="Delete chat"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="user-menu">
                    <button onClick={handleLogout} className="menu-item">
                        <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'rgba(168,85,247,0.2)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.75rem', border: '1px solid rgba(168,85,247,0.2)' }}>
                            <User className="w-4 h-4" />
                        </div>
                        <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>User</div>
                        <LogOut className="w-4 h-4 text-text-muted" />
                    </button>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="main-content">
                {/* Sticky Header */}
                <header className="chat-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="md:hidden">
                        <button onClick={() => setSidebarOpen(true)} style={{ padding: '0.5rem', marginLeft: '-0.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>



                    <div style={{ width: '2rem' }} className="md:hidden"></div> {/* Spacer for centering on mobile */}
                </header>

                {!activeThreadId && messages.length === 0 ? (
                    /* Home State */
                    <div className="chat-home fade-in">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                            <div style={{ width: '2.5rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={appIcon} alt="App Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 600 }}>What can I help with?</h1>
                        </div>

                        <div style={{ width: '100%', maxWidth: '700px' }}>
                            <div className="input-container" style={{ background: 'transparent', padding: 0 }}>
                                <ChatInputBox
                                    input={input}
                                    setInput={setInput}
                                    handleSend={handleSend}
                                    loading={loading}
                                    isMenuOpen={isMenuOpen}
                                    toggleMenu={toggleMenu}
                                    onOptionSelect={handleOptionSelect}
                                    fileInputRef={fileInputRef}
                                    handleFileUpload={handleFileUpload}
                                    searchMode={searchMode}
                                    setSearchMode={setSearchMode}
                                />
                            </div>
                        </div>

                        <div className="suggestion-grid">
                            {['Create a workout plan', 'Explain quantum physics', 'Write a python script', 'Plan a trip to Japan'].map(suggestion => (
                                <button
                                    key={suggestion}
                                    onClick={() => { setInput(suggestion); }}
                                    className="suggestion-chip"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Chat State */
                    <>
                        <div className="chat-scroll-area scrollbar-thin">
                            <div className="message-container">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`message-row ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                                        {msg.role !== 'user' && (
                                            <div className="avatar" style={{ border: 'none', background: 'transparent', borderRadius: 0 }}>
                                                <img src={appIcon} alt="AI" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            </div>
                                        )}

                                        <div className="message-content">
                                            <div className="prose prose-invert">
                                                {msg.role === 'error' ? (
                                                    <span style={{ color: '#f87171' }}>{msg.content}</span>
                                                ) : (
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={scrollRef} style={{ height: '1rem' }} />
                            </div>
                        </div>

                        <ChatInputBox
                            input={input}
                            setInput={setInput}
                            handleSend={handleSend}
                            loading={loading}
                            isMenuOpen={isMenuOpen}
                            toggleMenu={toggleMenu}
                            onOptionSelect={handleOptionSelect}
                            fileInputRef={fileInputRef}
                            handleFileUpload={handleFileUpload}
                            searchMode={searchMode}
                            setSearchMode={setSearchMode}
                        />
                    </>
                )}
            </main>
        </div>
    );
}

// Shared Input Component extracted to prevent re-renders
// Shared Input Component extracted to prevent re-renders
const ChatInputBox = ({
    input, setInput, handleSend, loading,
    isMenuOpen, toggleMenu, onOptionSelect,
    fileInputRef, handleFileUpload, searchMode, setSearchMode
}) => (
    <div className="input-container">
        {searchMode && (
            <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--cyan-primary)', fontSize: '0.875rem' }}>
                <Globe className="w-4 h-4" />
                <span>Web Search Active</span>
                <button onClick={() => setSearchMode(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X className="w-3 h-3" />
                </button>
            </div>
        )}
        <form onSubmit={handleSend} className="input-box-wrapper">
            <div style={{ position: 'relative' }}>
                <button type="button" className="plus-btn" onClick={toggleMenu}>
                    <Plus className="w-5 h-5" />
                </button>
                {isMenuOpen && (
                    <div className="chat-options-menu">
                        <button type="button" className="chat-option-item" onClick={() => onOptionSelect('upload')}>
                            <FileUp />
                            <span>Add photos & files</span>
                        </button>
                        <button type="button" className="chat-option-item" onClick={() => onOptionSelect('webSearch')}>
                            <Globe />
                            <span>Web Search</span>
                        </button>
                        <button type="button" className="chat-option-item" onClick={() => onOptionSelect('thinking')}>
                            <BrainCircuit />
                            <span>Thinking</span>
                        </button>
                    </div>
                )}
            </div>

            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                    }
                }}
                placeholder={searchMode ? "Search web..." : "Message ChatGPT"}
                className="chat-textarea scrollbar-thin"
                rows={1}
            />

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
            />

            <div className="input-actions" style={{ marginLeft: 'auto' }}>
                {input.trim() ? (
                    <button
                        type="submit"
                        className="send-btn"
                        disabled={loading}
                    >
                        <ArrowUp className="w-5 h-5" />
                    </button>
                ) : (
                    <button type="button" className="attach-btn" title="Voice typing">
                        <Mic className="w-5 h-5" />
                    </button>
                )}
            </div>
        </form>
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            ChatGPT can make mistakes. Check important info.
        </div>
    </div>
);
