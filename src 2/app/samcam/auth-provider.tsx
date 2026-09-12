"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/samcam/lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  imports: any[];
  setImports: React.Dispatch<React.SetStateAction<any[]>>;
  importsLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  imports: [], 
  setImports: () => {}, 
  importsLoading: true 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [imports, setImports] = useState<any[]>([]);
  const [importsLoading, setImportsLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      console.error("Firebase auth is not initialized. Check your environment variables.");
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setImports([]);
      setImportsLoading(false);
      return;
    }

    const q = query(
      collection(db, "card_imports"), 
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const filteredDocs = docs.filter(d => d.userId === user.uid || d.userId === 'anonymous');
      setImports(filteredDocs);
      setImportsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, imports, setImports, importsLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);



