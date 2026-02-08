import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import {
  AuthState,
  GoogleUser,
  getAuthState,
  saveAuthState,
  clearAuthState,
  getSheetUrl,
  saveSheetUrl,
  clearSheetUrl,
} from '../services/auth';
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from '../config';

interface AuthContextType extends AuthState {
  sheetUrl: string | null;
  signIn: () => void;
  signOut: () => void;
  setSheetUrl: (url: string) => void;
  disconnectSheet: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(getAuthState);
  const [sheetUrl, setSheetUrlState] = useState<string | null>(getSheetUrl);
  const [isLoading, setIsLoading] = useState(false);

  // Google login hook
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        // Fetch user info using the access token
        const userInfoResponse = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          }
        );
        const userInfo = await userInfoResponse.json();

        const user: GoogleUser = {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
        };

        const newState: AuthState = {
          isSignedIn: true,
          user,
          accessToken: tokenResponse.access_token,
        };

        setAuthState(newState);
        saveAuthState(newState);
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google login failed:', error);
      setIsLoading(false);
    },
    scope: GOOGLE_SCOPES,
  });

  const signIn = useCallback(() => {
    setIsLoading(true);
    googleLogin();
  }, [googleLogin]);

  const signOut = useCallback(() => {
    setAuthState({ isSignedIn: false, user: null, accessToken: null });
    clearAuthState();
    // Optionally clear sheet URL on sign out
    // clearSheetUrl();
    // setSheetUrlState(null);
  }, []);

  const setSheetUrl = useCallback((url: string) => {
    saveSheetUrl(url);
    setSheetUrlState(url);
  }, []);

  const disconnectSheet = useCallback(() => {
    clearSheetUrl();
    setSheetUrlState(null);
  }, []);

  // Check token validity on mount
  useEffect(() => {
    const checkToken = async () => {
      const { accessToken } = getAuthState();
      if (accessToken) {
        try {
          // Verify token is still valid
          const response = await fetch(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          if (!response.ok) {
            // Token expired, clear state
            signOut();
          }
        } catch {
          signOut();
        }
      }
    };
    checkToken();
  }, [signOut]);

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        sheetUrl,
        signIn,
        signOut,
        setSheetUrl,
        disconnectSheet,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">Configuration Required</h1>
          <p className="text-gray-600 mb-4">
            Google OAuth is not configured. Please set the <code className="bg-gray-100 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> environment variable.
          </p>
          <p className="text-sm text-gray-500">
            Create a <code className="bg-gray-100 px-1 rounded">.env</code> file with:
          </p>
          <pre className="bg-gray-800 text-green-400 p-3 rounded mt-2 text-sm overflow-x-auto">
            VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
          </pre>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </GoogleOAuthProvider>
  );
}
