import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/lib/authService';

interface TutorialContextType {
  tutorialCompleted: boolean;
  tutorialLoading: boolean;
  tutorialReplayRequested: boolean;
  completeTutorial: () => Promise<void>;
  requestTutorialReplay: () => void;
}

const TutorialContext = createContext<TutorialContextType>({
  tutorialCompleted: false,
  tutorialLoading: true,
  tutorialReplayRequested: false,
  completeTutorial: async () => {},
  requestTutorialReplay: () => {},
});

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const { currentUserId, isBookdropUser, loading: authLoading } = useAuth();
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [tutorialLoading, setTutorialLoading] = useState(true);
  const [tutorialReplayRequested, setTutorialReplayRequested] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUserId) {
      setTutorialCompleted(false);
      setTutorialReplayRequested(false);
      setTutorialLoading(false);
      return;
    }

    // Bookdrop users have no tutorial — skip the API call entirely
    if (isBookdropUser) {
      setTutorialCompleted(true);
      setTutorialReplayRequested(false);
      setTutorialLoading(false);
      return;
    }

    let cancelled = false;
    setTutorialLoading(true);
    authService.getTutorialStatus(currentUserId)
      .then((status) => {
        if (cancelled) return;
        setTutorialCompleted(status.tutorialCompleted === true);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('Failed to load tutorial completion status:', e);
        setTutorialCompleted(true);
      })
      .finally(() => {
        if (cancelled) return;
        setTutorialLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, currentUserId, isBookdropUser]);

  const completeTutorial = useCallback(async () => {
    setTutorialReplayRequested(false);
    if (!currentUserId) return;

    try {
      const status = await authService.updateTutorialStatus(currentUserId, true);
      setTutorialCompleted(status.tutorialCompleted === true);
    } catch (e) {
      console.error('Failed to persist tutorial completion flag:', e);
      setTutorialCompleted(true);
    }
  }, [currentUserId]);

  const requestTutorialReplay = useCallback(() => {
    setTutorialReplayRequested(true);
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        tutorialCompleted,
        tutorialLoading,
        tutorialReplayRequested,
        completeTutorial,
        requestTutorialReplay,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export const useTutorial = () => useContext(TutorialContext);
