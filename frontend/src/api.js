import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:5000",
  timeout: 20000, // ✅ AI requests may take longer
});

// ✅ attach token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ optional global response handler
api.interceptors.response.use(
  (res) => res,
  (error) => {
    // backend offline / CORS / network error
    if (!error.response) {
      return Promise.reject({
        message:
          "Backend server not reachable (Flask is off or wrong URL). Start backend: python main.py",
      });
    }

    // unauthorized token
    if (error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    return Promise.reject(error);
  }
);

export default api;
