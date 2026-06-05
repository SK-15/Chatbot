const API_URL = 'https://chatbot-backend-jvx6.onrender.com';

export const api = {
    async signup(email, password) {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
            const error = await response.json();
            let msg = error.detail || 'Signup failed';
            if (typeof msg === 'string' && msg.includes('for url:')) {
                msg = msg.includes('422') ? 'Account creation failed: Invalid email or weak password (must be 8+ chars).' : 'Signup failed. Please try again.';
            }
            throw new Error(msg);
        }
        return response.json();
    },

    async login(email, password) {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
            const error = await response.json();
            let msg = error.detail || 'Login failed';
            if (typeof msg === 'string' && msg.includes('for url:')) {
                msg = msg.includes('401') ? 'Invalid email or password.' : 'Login failed. Please try again.';
            }
            throw new Error(msg);
        }
        return response.json();
    },

    async createChat(title = "New Chat", token) {
        const response = await fetch(`${API_URL}/new_chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title })
        });
        if (!response.ok) {
            throw new Error('Failed to create new chat');
        }
        return response.json();
    },

    async getThreads(token) {
        const response = await fetch(`${API_URL}/threads`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch threads');
        return response.json();
    },

    async getThreadHistory(threadId, token) {
        const response = await fetch(`${API_URL}/threads/${threadId}/chats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch chat history');
        return response.json();
    },

    async chat(prompt, threadId, provider, token, onChunk, onError, onFinish) {
        try {
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    prompt,
                    thread_id: threadId,
                    provider
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Chat request failed');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = decoder.decode(value, { stream: true });
                onChunk(text);
            }

            if (onFinish) onFinish();

        } catch (error) {
            if (onError) onError(error.message);
        }
    },
    async webSearch(query, token) {
        const response = await fetch(`${API_URL}/websearch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query })
        });
        if (!response.ok) throw new Error('Web search failed');
        return response.json();
    },

    async deleteThread(threadId, token) {
        const response = await fetch(`${API_URL}/threads/${threadId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to delete thread');
        return response.json();
    },

    async uploadFile(threadId, file, token) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/upload?thread_id=${threadId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        if (!response.ok) throw new Error('File upload failed');
        return response.json();
    },
};
