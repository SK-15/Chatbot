const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = {
    async signup(email, password) {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Signup failed');
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
            throw new Error(error.detail || 'Login failed');
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
};
