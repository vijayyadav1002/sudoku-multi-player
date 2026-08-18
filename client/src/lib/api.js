const API_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export async function saveGame(gameData, accessToken) {
  try {
    await fetch(`${API_URL}/api/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(gameData),
    });
  } catch {
    // Non-critical — localStorage still has the record
  }
}
