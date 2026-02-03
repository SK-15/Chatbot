import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage for token on mount
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('user_id');
        if (token && userId) {
            setUser({ id: userId });
        }
        setLoading(false);
    }, []);

    const login = (token, userId) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user_id', userId);
        setUser({ id: userId });
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        setUser(null);
    };

    const value = {
        user,
        login,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
