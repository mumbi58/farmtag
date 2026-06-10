import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import api from "@/constants/api";
import { initPurchases } from "@/utils/purchases";

// Configure local notification handlers
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (user && user.id) {
      initPurchases(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      registerForPushNotificationsAsync().then(pushToken => {
        if (pushToken) {
          api.post("/profile/push-token", { push_token: pushToken })
            .then(() => console.log("[PUSH] Token registered successfully on backend"))
            .catch(err => console.log("[PUSH] Failed to register token on backend:", err.message));
        }
      });
    }
  }, [token]);

  async function registerForPushNotificationsAsync() {
    let token;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
      if (!projectId) {
        console.log('[PUSH] Project ID not found in config. Skipping push token registration.');
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('[PUSH] Token acquired:', token);
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.log("[AUTH] Failed to load stored auth:", e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { token, user } = res.data;
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("user", JSON.stringify(user));
    setToken(token);
    setUser(user);
    router.replace("/(tabs)/dashboard");
  };

  const register = async (name, email, password, phone) => {
    const res = await api.post("/auth/register", {
      name,
      email,
      password,
      phone,
    });
    const { token, user } = res.data;
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("user", JSON.stringify(user));
    setToken(token);
    setUser(user);
    router.replace("/(tabs)/dashboard");
  };

  const loginWithGoogle = async (idToken, fallbackDetails = {}) => {
    const res = await api.post("/auth/google", {
      id_token: idToken,
      id: fallbackDetails.id,
      email: fallbackDetails.email,
      name: fallbackDetails.name,
    });
    const { token, user } = res.data;
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("user", JSON.stringify(user));
    setToken(token);
    setUser(user);
    router.replace("/(tabs)/dashboard");
  };

  const loginWithApple = async (identityToken, userID, fallbackDetails = {}) => {
    const res = await api.post("/auth/apple", {
      identity_token: identityToken,
      user_id: userID,
      email: fallbackDetails.email,
      name: fallbackDetails.name,
    });
    const { token, user } = res.data;
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("user", JSON.stringify(user));
    setToken(token);
    setUser(user);
    router.replace("/(tabs)/dashboard");
  };

  const logout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    setToken(null);
    setUser(null);
    router.replace("/login");
  };

  const updateUserFields = async (fields) => {
    if (!user) return;
    const updated = { ...user, ...fields };
    await AsyncStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        loginWithGoogle,
        loginWithApple,
        updateUserFields,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
