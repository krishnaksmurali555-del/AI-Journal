import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  auth, 
  firebaseConfig,
  isApiKeyConfigured,
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    }, (err) => {
      console.error('Auth state change error:', err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      setError(null);
      setLoading(true);

      if (!isApiKeyConfigured && (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'AIzaSyPlaceholderKeyForBuildSafetyOnly')) {
        setError(
          `Firebase Web API Key is missing. In Vercel Project Settings -> Environment Variables, add "VITE_FIREBASE_API_KEY" with your Web API Key from Firebase project "${firebaseConfig.projectId}".`
        );
        return;
      }

      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      if (err.code === 'auth/invalid-api-key') {
        setError(
          `Invalid Firebase API Key. Please provide your Web App API key in Vercel environment variables as "VITE_FIREBASE_API_KEY" (from Firebase Console -> Project Settings -> General -> Your Apps for "${firebaseConfig.projectId}").`
        );
      } else if (err.code === 'auth/popup-blocked') {
        setError('Sign-in popup was blocked by browser. Please allow popups for this site and try again.');
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(
          `Unauthorized Domain (${window.location.hostname}): This domain is not authorized in Firebase Project "${firebaseConfig.projectId}" (${firebaseConfig.authDomain}). Add "${window.location.hostname}" to Firebase Console -> Authentication -> Settings -> Authorized domains in project "${firebaseConfig.projectId}".`
        );
      } else {
        setError(err.message || 'Failed to sign in with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (err: any) {
      setError(err.message || 'Failed to log out.');
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (err) {
      console.error('Failed to retrieve Firebase ID token:', err);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, setError, login, logout, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
