import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const chatWithAssistant = async (message, sessionId = 'default-session') => {
  try {
    const response = await api.post('/api/chat', { message, session_id: sessionId });
    return response.data;
  } catch (error) {
    console.error('Error talking to AI:', error);
    throw error;
  }
};

export default api;
