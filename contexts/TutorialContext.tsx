import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const TUTORIAL_KEY = 'bookmerang_tutorial_completed';

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
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [tutorialLoading, setTutorialLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(TUTORIAL_KEY).then((value) => {
      setTutorialCompleted(value === 'true');
      setTutorialLoading(false);
    });
  }, []);

  const completeTutorial = useCallback(async () => {
    await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
    setTutorialCompleted(true);
  }, []);

  const resetTutorial = useCallback(async () => {
    await AsyncStorage.removeItem(TUTORIAL_KEY);
    setTutorialCompleted(false);
  }, []);

  return (
    <TutorialContext.Provider value={{ tutorialCompleted, tutorialLoading, completeTutorial, resetTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
}

export const useTutorial = () => useContext(TutorialContext);
