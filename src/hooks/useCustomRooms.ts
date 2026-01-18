import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_ROOMS } from '@/lib/types';

export function useCustomRooms() {
  const [customRooms, setCustomRooms] = useLocalStorage<string[]>('homelog:custom-rooms', []);

  const addCustomRoom = (room: string) => {
    const trimmed = room.trim();
    if (!trimmed) return;

    // Check if it's already in default or custom rooms
    const allRooms = [...DEFAULT_ROOMS, ...customRooms];
    if (allRooms.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
      return; // Already exists
    }

    setCustomRooms([...customRooms, trimmed]);
  };

  const removeCustomRoom = (room: string) => {
    setCustomRooms(customRooms.filter(r => r !== room));
  };

  // Combine and sort all rooms alphabetically
  const allRooms = [...DEFAULT_ROOMS, ...customRooms].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  return {
    customRooms,
    allRooms,
    addCustomRoom,
    removeCustomRoom,
  };
}
