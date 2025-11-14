const API_BASE_URL = `${window.location.origin}/api/v1`;

export async function generateAutoCompletion(
  token: string,
  text: string
): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/autocomplete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.completion || null;
  } catch (error) {
    console.error('Autocomplete error:', error);
    return null;
  }
}

