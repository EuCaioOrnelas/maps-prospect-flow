import { useState, useEffect, useCallback } from 'react';

const DRAFTS_STORAGE_KEY = 'chat_drafts';

interface ChatDrafts {
  [conversationId: string]: string;
}

export const useChatDrafts = (conversationId: string | null) => {
  const [draft, setDraft] = useState('');

  // Load draft when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setDraft('');
      return;
    }

    try {
      const drafts = getDrafts();
      setDraft(drafts[conversationId] || '');
    } catch (error) {
      console.error('Error loading draft:', error);
      setDraft('');
    }
  }, [conversationId]);

  // Get all drafts from localStorage
  const getDrafts = useCallback((): ChatDrafts => {
    try {
      const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, []);

  // Save draft to localStorage
  const saveDraft = useCallback((text: string) => {
    if (!conversationId) return;
    
    setDraft(text);
    
    try {
      const drafts = getDrafts();
      
      if (text.trim()) {
        drafts[conversationId] = text;
      } else {
        // Remove empty drafts
        delete drafts[conversationId];
      }
      
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [conversationId, getDrafts]);

  // Clear draft for current conversation
  const clearDraft = useCallback(() => {
    if (!conversationId) return;
    
    setDraft('');
    
    try {
      const drafts = getDrafts();
      delete drafts[conversationId];
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, [conversationId, getDrafts]);

  // Get draft for a specific conversation (for showing in conversation list)
  const getDraftForConversation = useCallback((convId: string): string | null => {
    try {
      const drafts = getDrafts();
      return drafts[convId] || null;
    } catch {
      return null;
    }
  }, [getDrafts]);

  return {
    draft,
    saveDraft,
    clearDraft,
    getDraftForConversation,
  };
};
