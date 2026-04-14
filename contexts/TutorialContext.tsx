import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TutorialContextType {
  tutorialCompleted: boolean;
  tutorialLoading: boolean;
  completeTutorial: () => Promise<void>;
  resetTutorial: () => Promise<void>;
}

const TutorialContext = createContext<TutorialContextType>({
  tutorialCompleted: false,
  tutorialLoading: true,
  completeTutorial: async () => {},
  resetTutorial: async () => {},
});

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const { currentUserId, loading: authLoading } = useAuth();
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [tutorialLoading, setTutorialLoading] = useState(true);

  const getTutorialKey = useCallback(() => {
    if (currentUserId) {
      return `bookmerang_tutorial_completed_${currentUserId}`;
    }
    return 'bookmerang_tutorial_completed';
  }, [currentUserId]);

  useEffect(() => {
    if (authLoading) return;

    const key = getTutorialKey();
    setTutorialLoading(true);
    AsyncStorage.getItem(key).then((value) => {
      setTutorialCompleted(value === 'true');
      setTutorialLoading(false);
    });
  }, [authLoading, getTutorialKey]);

  const completeTutorial = useCallback(async () => {
    const key = getTutorialKey();
    try {
      await AsyncStorage.setItem(key, 'true');
      setTutorialCompleted(true);
    } catch (e) {
      console.error('Failed to set tutorial completion flag:', e);
    }
  }, [getTutorialKey]);

  const resetTutorial = useCallback(async () => {
    const key = getTutorialKey();
    try {
      await AsyncStorage.removeItem(key);
      setTutorialCompleted(false);
    } catch (e) {
      console.error('Failed to remove tutorial completion flag:', e);
    }
  }, [getTutorialKey]);

  return (
    <TutorialContext.Provider value={{ tutorialCompleted, tutorialLoading, completeTutorial, resetTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
}

export const useTutorial = () => useContext(TutorialContext);

