import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LogOut, Plus, Send, Bot, User, Loader2, Menu, X, Mic, Paperclip, ChevronDown, Sparkles, MessageSquare } from 'lucide-react';

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
    const scrollRef = useRef(null);

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
            const data = await api.getThreadHistory(threadId, token);
            // Transform backend message format to frontend format if needed
            // Backend: { query: "...", response: "...", created_at: "..." }
            // Frontend: { role: 'user', content: "..." }, { role: 'assistant', content: "..." }

            const history = [];
            if (data.chats) {
                data.chats.forEach(chat => {
                    history.push({ role: 'user', content: chat.query });
                    history.push({ role: 'assistant', content: chat.response });
                });
            }
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

    const startNewChat = () => {
        setMessages([]);
        setActiveThreadId(null);
        setSidebarOpen(false);
    };

    // Shared Input Component
    const ChatInputBox = () => (
        <div className="input-container">
            <form onSubmit={handleSend} className="input-box-wrapper">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend(e);
                        }
                    }}
                    placeholder="Message ChatGPT"
                    className="chat-textarea scrollbar-thin"
                    rows={1}
                />

                <div className="input-actions">
                    <button type="button" className="attach-btn" title="Add attachment">
                        <Paperclip className="w-5 h-5" />
                    </button>

                    {input.trim() ? (
                        <button
                            type="submit"
                            className="send-btn"
                            disabled={loading}
                        >
                            <Send className="w-4 h-4" />
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
                            <div style={{ background: 'var(--text-primary)', color: 'var(--bg-color)', padding: '0.125rem', borderRadius: '50%' }}>
                                <div style={{ width: '1rem', height: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '10px' }}>C</div>
                            </div>
                            New Chat
                        </span>
                        <Plus className="w-4 h-4 text-text-secondary" />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }} className="scrollbar-thin">
                    <div className="sidebar-section-title">History</div>
                    {threads.map(thread => (
                        <button
                            key={thread.id}
                            onClick={() => loadThreadHistory(thread.id)}
                            className={`history-item ${activeThreadId === thread.id ? 'active' : ''}`}
                        >
                            {thread.title}
                        </button>
                    ))}
                </div>

                <div className="user-menu">
                    <button className="menu-item">
                        <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 500 }}>Upgrade plan</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Get GPT-4, DALL·E, and more</div>
                        </div>
                    </button>

                    <button onClick={handleLogout} className="menu-item">
                        <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'rgba(168,85,247,0.2)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.75rem', border: '1px solid rgba(168,85,247,0.2)' }}>
                            {user?.id ? user.id.substring(0, 2).toUpperCase() : 'U'}
                        </div>
                        <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.id || 'User'}</div>
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

                    <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', margin: '0 auto', color: 'var(--text-secondary)', fontSize: '1.125rem', fontWeight: 500 }}>
                        <span>{provider === 'openai' ? 'ChatGPT 4o' : 'Gemini 1.5'}</span>
                        <ChevronDown className="w-4 h-4 opacity-50" />
                    </button>

                    <div style={{ width: '2rem' }} className="md:hidden"></div> {/* Spacer for centering on mobile */}
                </header>

                {!activeThreadId && messages.length === 0 ? (
                    /* Home State */
                    <div className="chat-home fade-in">
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ width: '3rem', height: '3rem', background: 'var(--text-primary)', color: 'var(--bg-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                {/* Logo */}
                            </div>
                        </div>
                        <h1>What can I help with?</h1>

                        <div style={{ width: '100%', maxWidth: '700px' }}>
                            <div className="input-container" style={{ background: 'transparent', padding: 0 }}>
                                <form onSubmit={handleSend} className="input-box-wrapper">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend(e);
                                            }
                                        }}
                                        placeholder="Message ChatGPT"
                                        className="chat-textarea scrollbar-thin"
                                        rows={1}
                                    />

                                    <div className="input-actions">
                                        <button type="button" className="attach-btn" title="Add attachment">
                                            <Paperclip className="w-5 h-5" />
                                        </button>

                                        {input.trim() ? (
                                            <button type="submit" className="send-btn" disabled={loading}>
                                                <Send className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button type="button" className="attach-btn" title="Voice typing">
                                                <Mic className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </form>
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
                                            <div className="avatar">
                                                <Bot className="w-5 h-5 text-text-primary" />
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

                        <ChatInputBox />
                    </>
                )}
            </main>
        </div>
    );
}
