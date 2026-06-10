import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  NativeModules,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";

// Safely require Google and Apple native modules only if they are present in the binary (prevents Expo Go crash)
let GoogleSignin = null;
if (NativeModules.RNGoogleSignin) {
  try {
    GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
  } catch (e) {
    console.log("[AUTH] Google Sign-in module not loaded:", e.message);
  }
}

let AppleAuthentication = null;
try {
  AppleAuthentication = require("expo-apple-authentication");
} catch (e) {
  console.log("[AUTH] Apple Authentication module not loaded:", e.message);
}

export default function LoginPage() {
  const { user, login, loginWithGoogle, loginWithApple } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace("/(tabs)/dashboard");
    }
  }, [user]);

  useEffect(() => {
    if (GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId: "1008719970978-example.apps.googleusercontent.com", // Replace with your actual Google Client ID if configuring production client
          offlineAccess: true,
        });
      } catch (e) {
        console.log("[AUTH] Google Sign-in configuration failed:", e.message);
      }
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Login required", "Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      Alert.alert("Success", "User login successful");
    } catch (error) {
      const status = error?.response?.status;
      let message = "Something went wrong. Please try again.";
      if (status === 401) {
        message = "Wrong email or password. Please try again.";
      } else if (status === 404) {
        message = "Account not found. Please check your email.";
      } else if (status === 0 || error.message === "Network Error") {
        message = "No internet connection. Please check your network.";
      } else if (error?.response?.data?.error) {
        message = error.response.data.error;
      }
      Alert.alert("Login Failed", message);
    }finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!GoogleSignin) {
      Alert.alert(
        "Google Sign-In Native Setup Required",
        "Google Sign-in requires native configuration and a development build. Do you want to bypass using a development test account instead?",
        [
          { text: "Cancel", style: "cancel", onPress: () => setSubmitting(false) },
          {
            text: "Bypass (Dev Mode)",
            onPress: async () => {
              setSubmitting(true);
              try {
                await loginWithGoogle("", {
                  id: "google_dev_user_123",
                  email: "google_user@kerdonet.com",
                  name: "Google FarmTag User",
                });
                Alert.alert("Success", "Signed in with Dev Google Account!");
              } catch (err) {
                Alert.alert("Error", err.message);
              } finally {
                setSubmitting(false);
              }
            }
          }
        ]
      );
      return;
    }

    setSubmitting(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      
      const idToken = response.data?.idToken || response.idToken;
      const userObj = response.data?.user || response.user;
      
      if (!idToken) {
        throw new Error("Failed to retrieve ID Token from Google");
      }

      await loginWithGoogle(idToken, {
        id: userObj.id,
        email: userObj.email,
        name: userObj.name || "",
      });
      Alert.alert("Success", "Signed in with Google!");
    } catch (error) {
      console.log("[GOOGLE SIGN-IN] Error details:", error);
      Alert.alert("Google Sign-In Failed", error.message || "An unknown error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppleLogin = async () => {
    const isAvailable = AppleAuthentication && await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        "Apple Sign-In Not Available",
        "Apple Sign-in is not supported on this device/simulator, or you are running in Expo Go. Do you want to bypass using a development test account?",
        [
          { text: "Cancel", style: "cancel", onPress: () => setSubmitting(false) },
          {
            text: "Bypass (Dev Mode)",
            onPress: async () => {
              setSubmitting(true);
              try {
                await loginWithApple("", "apple_dev_user_456", {
                  email: "apple_user@kerdonet.com",
                  name: "Apple FarmTag User",
                });
                Alert.alert("Success", "Signed in with Dev Apple ID!");
              } catch (err) {
                Alert.alert("Error", err.message);
              } finally {
                setSubmitting(false);
              }
            }
          }
        ]
      );
      return;
    }

    setSubmitting(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const name = credential.fullName ? 
        [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(" ") : "";

      await loginWithApple(credential.identityToken, credential.user, {
        email: credential.email || "",
        name: name,
      });
      Alert.alert("Success", "Signed in with Apple!");
    } catch (error) {
      console.log("[APPLE SIGN-IN] Error details:", error);
      if (error.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Apple Sign-In Failed", error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.title}>FarmTag Login</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={Colors.textLight}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={Colors.textLight}
          secureTextEntry
          style={styles.input}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

       <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => router.push("/forgot-password")}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Buttons Row */}
        <View style={styles.socialContainer}>
          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={handleGoogleLogin} 
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={20} color="#DB4437" style={styles.socialIcon} />
            <Text style={styles.googleButtonText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.appleButton} 
            onPress={handleAppleLogin} 
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-apple" size={20} color="#FFFFFF" style={styles.socialIcon} />
            <Text style={styles.appleButtonText}>Apple</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push("/register")}
        >
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
    padding: 24,
  },
  box: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: Colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 20,
  },
  input: {
    height: 52,
    borderWidth: 0,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    color: Colors.text,
    backgroundColor: Colors.green100,
  },
  button: {
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  forgotBtn: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  forgotText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: Colors.textLight,
    fontSize: 13,
    fontWeight: "500",
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  googleButton: {
    flex: 1,
    flexDirection: "row",
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleButtonText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  appleButton: {
    flex: 1,
    flexDirection: "row",
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.black,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  appleButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  socialIcon: {
    marginRight: 8,
  },
  linkButton: {
    marginTop: 20,
    alignItems: "center",
  },
  linkText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});
