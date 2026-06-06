import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/context/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BirthProvider } from "@/context/BirthContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BirthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="index" />
  <Stack.Screen name="login" />
  <Stack.Screen name="register" />
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="animals/[id]" />
  <Stack.Screen name="animals/add" />
  <Stack.Screen name="farms/add" />
  <Stack.Screen name="farms/[id]" />
  <Stack.Screen name="expenses/add" />
  <Stack.Screen name="births/add" />
  <Stack.Screen name="pregnancies/add" />
  <Stack.Screen name="health/add" />
  <Stack.Screen name="profile" />
  <Stack.Screen name="settings" />
</Stack>
</BirthProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
