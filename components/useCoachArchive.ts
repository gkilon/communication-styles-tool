import { useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export interface Message {
  sender: 'user' | 'ai';
  text: string;
  isError?: boolean;
}

export interface CoachChat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface CoachArchive {
  chats: CoachChat[];
  activeId: string | null;
  loaded: boolean;
  saveFailed: boolean;
  newChat: () => void;
  openChat: (id: string) => void;
  removeChat: (id: string) => Promise<void>;
}

const MAX_CHATS = 30;
const MAX_MESSAGES = 200;

const cleanMessages = (msgs: Message[]): Message[] =>
  msgs
    .filter(m => !m.isError && m.text && m.text.trim())
    .slice(-MAX_MESSAGES)
    .map(m => ({ sender: m.sender, text: m.text }));

const makeTitle = (msgs: Message[]): string => {
  const first = msgs.find(m => m.sender === 'user');
  const text = (first ? first.text : msgs[0]?.text || '').replace(/\s+/g, ' ').trim();
  return text.length > 48 ? text.slice(0, 48) + '…' : text || '...';
};

const getUid = (): string | null => (auth && auth.currentUser ? auth.currentUser.uid : null);

/**
 * Personal archive of the advisor conversations: every conversation is saved
 * automatically under the signed-in user (users/{uid}/coach_chats) after each completed
 * answer, and the latest one is reopened when the results screen opens.
 * The conversation itself lives in the parent (so it survives tab switches); this hook
 * only syncs it with the archive.
 */
export function useCoachArchive(
  conversation: Message[],
  setConversation: React.Dispatch<React.SetStateAction<Message[]>>,
  isLoading: boolean,
  setUserInput: React.Dispatch<React.SetStateAction<string>>
): CoachArchive {
  const [chats, setChats] = useState<CoachChat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const activeIdRef = useRef<string | null>(null);
  const lastSavedRef = useRef('');
  const chatsRef = useRef<CoachChat[]>([]);
  const conversationRef = useRef<Message[]>(conversation);
  chatsRef.current = chats;
  conversationRef.current = conversation;

  const openFromList = (c: CoachChat) => {
    activeIdRef.current = c.id;
    setActiveId(c.id);
    lastSavedRef.current = JSON.stringify(cleanMessages(c.messages));
    setConversation(c.messages);
  };

  // Load the archive once, and reopen the latest conversation if nothing is open yet.
  useEffect(() => {
    const uid = getUid();
    if (!uid || !db) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const q = query(collection(db, 'users', uid, 'coach_chats'), orderBy('updatedAt', 'desc'), limit(MAX_CHATS));
        const snap = await getDocs(q);
        if (cancelled) return;
        const list: CoachChat[] = snap.docs.map(d => {
          const data = d.data() as any;
          return {
            id: d.id,
            title: data.title || '...',
            createdAt: data.createdAt || data.updatedAt || '',
            updatedAt: data.updatedAt || '',
            messages: Array.isArray(data.messages) ? data.messages : []
          };
        });
        setChats(list);
        if (list.length > 0 && conversationRef.current.length === 0 && !activeIdRef.current) {
          openFromList(list[0]);
        }
      } catch (err) {
        console.error('Error loading advisor chats:', err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save after every completed answer (not while the answer is still streaming).
  useEffect(() => {
    if (isLoading) return;
    const cleaned = cleanMessages(conversation);
    if (cleaned.length === 0) return;
    const sig = JSON.stringify(cleaned);
    if (sig === lastSavedRef.current) return;
    const uid = getUid();
    if (!uid || !db) return;

    let id = activeIdRef.current;
    if (!id) {
      id = doc(collection(db, 'users', uid, 'coach_chats')).id;
      activeIdRef.current = id;
      setActiveId(id);
    }
    const existing = chatsRef.current.find(c => c.id === id);
    const now = new Date().toISOString();
    const title = existing ? existing.title : makeTitle(cleaned);
    const createdAt = existing ? existing.createdAt : now;
    const savedId = id;

    (async () => {
      try {
        await setDoc(doc(db, 'users', uid, 'coach_chats', savedId), {
          title,
          createdAt,
          updatedAt: now,
          messages: cleaned
        });
        lastSavedRef.current = sig;
        setSaveFailed(false);
        setChats(prev => [
          { id: savedId, title, createdAt, updatedAt: now, messages: cleaned },
          ...prev.filter(c => c.id !== savedId)
        ]);
      } catch (err) {
        console.error('Error saving advisor chat:', err);
        setSaveFailed(true);
      }
    })();
  }, [conversation, isLoading]);

  const resetToEmpty = () => {
    activeIdRef.current = null;
    setActiveId(null);
    lastSavedRef.current = '';
    setConversation([]);
    setUserInput('');
  };

  const newChat = () => {
    if (isLoading) return;
    resetToEmpty();
  };

  const openChat = (id: string) => {
    if (isLoading) return;
    const c = chatsRef.current.find(x => x.id === id);
    if (c) openFromList(c);
  };

  const removeChat = async (id: string) => {
    const uid = getUid();
    if (!uid || !db) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'coach_chats', id));
      setChats(prev => prev.filter(c => c.id !== id));
      if (activeIdRef.current === id && !isLoading) resetToEmpty();
    } catch (err) {
      console.error('Error deleting advisor chat:', err);
    }
  };

  return { chats, activeId, loaded, saveFailed, newChat, openChat, removeChat };
}
