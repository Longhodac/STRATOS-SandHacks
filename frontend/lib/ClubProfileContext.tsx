import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ClubProfile } from '@/types';

const STORAGE_KEY = 'STRATOS_CLUB_PROFILE';

const DEFAULT_PROFILE: ClubProfile = {
  clubName: 'My Club',
  missionStatement: 'To build a sustainable club ecosystem that prioritizes collaboration, joint events, and seamless partnerships between school clubs.',
  interests: ['Web3', 'Career Dev', 'Python', 'Hackathons', 'Sponsorship'],
};

function loadProfile(): ClubProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed.interests && Array.isArray(parsed.interests)) {
        return {
          clubName: typeof parsed.clubName === 'string' ? parsed.clubName : DEFAULT_PROFILE.clubName,
          missionStatement: typeof parsed.missionStatement === 'string' ? parsed.missionStatement : DEFAULT_PROFILE.missionStatement,
          interests: parsed.interests as string[],
        };
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_PROFILE;
}

function saveProfile(profile: ClubProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

type ClubProfileContextValue = {
  profile: ClubProfile;
  setProfile: (next: ClubProfile | ((prev: ClubProfile) => ClubProfile)) => void;
  addInterest: (tag: string) => void;
  removeInterest: (tag: string) => void;
};

const ClubProfileContext = createContext<ClubProfileContextValue | null>(null);

export function ClubProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<ClubProfile>(loadProfile);

  const setProfile = useCallback((next: ClubProfile | ((prev: ClubProfile) => ClubProfile)) => {
    setProfileState((prev) => {
      const nextProfile = typeof next === 'function' ? next(prev) : next;
      saveProfile(nextProfile);
      return nextProfile;
    });
  }, []);

  const addInterest = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed) return;
      setProfile((prev) => ({
        ...prev,
        interests: prev.interests.includes(trimmed) ? prev.interests : [...prev.interests, trimmed],
      }));
    },
    [setProfile]
  );

  const removeInterest = useCallback(
    (tag: string) => {
      setProfile((prev) => ({
        ...prev,
        interests: prev.interests.filter((t) => t !== tag),
      }));
    },
    [setProfile]
  );

  const value = useMemo(
    () => ({
      profile,
      setProfile,
      addInterest,
      removeInterest,
    }),
    [profile, setProfile, addInterest, removeInterest]
  );

  return (
    <ClubProfileContext.Provider value={value}>
      {children}
    </ClubProfileContext.Provider>
  );
}

export function useClubProfile(): ClubProfileContextValue {
  const ctx = useContext(ClubProfileContext);
  if (!ctx) throw new Error('useClubProfile must be used within ClubProfileProvider');
  return ctx;
}
