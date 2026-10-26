import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  timeout: 135_000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const backendMessage = error.response?.data?.error;
    if (typeof backendMessage === "string" && backendMessage.trim()) {
      return Promise.reject(new Error(backendMessage));
    }
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return Promise.reject(new Error("The request took too long. Please try again."));
    }
    return Promise.reject(new Error("The service is unavailable. Check that the backend is running."));
  },
);

export default api;
