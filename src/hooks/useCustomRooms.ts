import { useMemo } from 'react';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { DEFAULT_ROOMS } from '@/lib/types';

export function useCustomRooms() {
  const { 
    preferences, 
    addCustomRoom, 
    removeCustomRoom,
    hideDefaultRoom,
    restoreDefaultRoom,
  } = useUserPreferences();

  const { customRooms, hiddenDefaultRooms = [] } = preferences;

  // Get visible default rooms (excluding hidden ones)
  const visibleDefaultRooms = useMemo(() => {
    return DEFAULT_ROOMS.filter(room => !hiddenDefaultRooms.includes(room));
  }, [hiddenDefaultRooms]);

  // Combine and sort all visible rooms alphabetically
  const allRooms = useMemo(() => {
    return [...visibleDefaultRooms, ...customRooms].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [visibleDefaultRooms, customRooms]);

  // Check if a room is a default room
  const isDefaultRoom = (room: string): boolean => {
    return DEFAULT_ROOMS.includes(room as typeof DEFAULT_ROOMS[number]);
  };

  // Remove a room (handles both custom and default rooms)
  const removeRoom = (room: string) => {
    if (isDefaultRoom(room)) {
      hideDefaultRoom(room);
    } else {
      removeCustomRoom(room);
    }
  };

  return {
    customRooms,
    hiddenDefaultRooms,
    visibleDefaultRooms,
    allRooms,
    addCustomRoom,
    removeCustomRoom,
    removeRoom,
    hideDefaultRoom,
    restoreDefaultRoom,
    isDefaultRoom,
  };
}
