export async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (cause) {
    throw new Error('Unable to reach the TriSaarathi API. Make sure the backend is running and try again.', { cause });
  }

  let data;
  try {
    data = await response.json();
  } catch (cause) {
    throw new Error(
      `The API returned an unreadable response (HTTP ${response.status}). Check that the backend is running and review its logs.`,
      { cause }
    );
  }

  if (!response.ok) {
    const error = new Error(data.error || 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }

  return data;
}
