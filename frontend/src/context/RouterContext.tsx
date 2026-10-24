import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface RouterContextType {
  path: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  matchRoute: (pattern: string) => { matched: boolean; params: Record<string, string> };
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

function getNormalizedPath(): string {
  if (typeof window === 'undefined') return '/';
  
  // Prefer pathname, fallback to hash if pathname is empty or /
  const hash = window.location.hash.replace(/^#/, '');
  if (hash && hash.startsWith('/')) {
    return hash;
  }
  
  const pathname = window.location.pathname;
  return pathname && pathname.length > 0 ? pathname : '/';
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [path, setPath] = useState<string>(getNormalizedPath);

  useEffect(() => {
    const handlePopState = () => {
      setPath(getNormalizedPath());
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const cleanTo = to.startsWith('/') ? to : `/${to}`;
    if (options?.replace) {
      window.history.replaceState(null, '', cleanTo);
    } else {
      window.history.pushState(null, '', cleanTo);
    }
    setPath(cleanTo);
  }, []);

  const matchRoute = useCallback((pattern: string) => {
    // Current normalized path without query string or hash
    const currentBase = path.split('?')[0].split('#')[0];
    const patternSegments = pattern.split('/').filter(Boolean);
    const currentSegments = currentBase.split('/').filter(Boolean);

    if (patternSegments.length !== currentSegments.length) {
      return { matched: false, params: {} };
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternSegments.length; i++) {
      const p = patternSegments[i];
      const c = currentSegments[i];

      if (p.startsWith(':')) {
        const paramName = p.slice(1);
        params[paramName] = decodeURIComponent(c);
      } else if (p.toLowerCase() !== c.toLowerCase()) {
        return { matched: false, params: {} };
      }
    }

    return { matched: true, params };
  }, [path]);

  return (
    <RouterContext.Provider value={{ path, navigate, matchRoute }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = (): RouterContextType => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
