import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const appConfig = Constants.expoConfig || Constants.manifest || {};
const apiHost =
  appConfig.extra?.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://102.0.6.213:8080";

export const BASE_URL = `${apiHost}/api/v1`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
    }
    return Promise.reject(error);
  },
);

export default api;
