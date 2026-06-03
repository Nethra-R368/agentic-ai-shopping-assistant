import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const chatWithAssistant = async (message, image = null, sessionId = 'default-session') => {
  try {
    const payload = { message, session_id: sessionId };
    if (image) payload.image = image;
    const response = await api.post('/api/chat', payload);
    return response.data;
  } catch (error) {
    console.error('Error talking to AI:', error);
    throw error;
  }
};

export default api;
