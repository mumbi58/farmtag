import { Platform } from "react-native";
import api from "@/constants/api";

// API Keys from RevenueCat Dashboard (can be configured in .env or hardcoded here as fallback/example)
const API_KEYS = {
  apple: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY || "appl_mock_placeholder_key",
  google: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY || "goog_mock_placeholder_key",
};

let Purchases = null;
let isConfigured = false;

// Try to import react-native-purchases dynamically.
// This prevents crashes in Expo Go if the native module isn't loaded/compiled.
try {
  Purchases = require("react-native-purchases").default;
} catch (e) {
  console.log("[RevenueCat] Native react-native-purchases not available (Expo Go / Simulation fallback)");
}

export const initPurchases = async (userId) => {
  if (!Purchases) {
    console.log("[RevenueCat] Running in simulated billing mode");
    return false;
  }

  try {
    const apiKey = Platform.OS === "ios" ? API_KEYS.apple : API_KEYS.google;
    const isPlaceholder = !apiKey || 
                          apiKey.includes("placeholder") || 
                          apiKey.startsWith("appl_your") || 
                          apiKey.startsWith("goog_your");

    if (isPlaceholder) {
      console.log("[RevenueCat] No valid API key configured. Running in simulated billing mode");
      Purchases = null; // force simulation fallback
      return false;
    }

    await Purchases.configure({ apiKey, appUserID: userId });
    isConfigured = true;
    console.log("[RevenueCat] Configured successfully for user:", userId);
    return true;
  } catch (err) {
    console.warn("[RevenueCat] Configuration error, falling back to simulator:", err.message);
    Purchases = null;
    return false;
  }
};

export const getSubscriptionPlans = async () => {
  if (!Purchases || !isConfigured) {
    // Simulated offerings
    return [
      {
        id: "monthly",
        label: "Monthly",
        price: "KES 300",
        period: "per month",
        savings: null,
      },
      {
        id: "yearly",
        label: "Yearly",
        price: "KES 2,000",
        period: "per year",
        savings: "Save KES 1,600",
      },
    ];
  }

  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current !== null && offerings.current.availablePackages.length > 0) {
      // Map RevenueCat offerings to our app plan format
      return offerings.current.availablePackages.map(pkg => {
        const isYearly = pkg.packageType === "YEARLY";
        return {
          id: isYearly ? "yearly" : "monthly",
          label: isYearly ? "Yearly" : "Monthly",
          price: pkg.product.priceString, // e.g. "KES 300.00" or "$2.99"
          period: isYearly ? "per year" : "per month",
          savings: isYearly ? "Save KES 1,600" : null,
          rawPackage: pkg // keep reference to buy
        };
      });
    }
  } catch (err) {
    console.warn("[RevenueCat] Error getting offerings, returning simulated:", err.message);
  }

  // Fallback plans
  return [
    {
      id: "monthly",
      label: "Monthly",
      price: "KES 300",
      period: "per month",
      savings: null,
    },
    {
      id: "yearly",
      label: "Yearly",
      price: "KES 2,000",
      period: "per year",
      savings: "Save KES 1,600",
    },
  ];
};

export const purchasePlan = async (planId, availablePlans) => {
  if (!Purchases || !isConfigured) {
    // Simulate payment sheet flow
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          // Call our backend to verify and record mock purchase
          const response = await api.post("/payments/verify-purchase", {
            plan: planId,
            is_mock: true,
          });
          resolve(response.data);
        } catch (error) {
          reject(error);
        }
      }, 1500); // 1.5s delay to mimic native sheet
    });
  }

  try {
    const plan = availablePlans.find(p => p.id === planId);
    if (!plan || !plan.rawPackage) {
      throw new Error("Package not found in current offerings");
    }

    const { customerInfo } = await Purchases.purchasePackage(plan.rawPackage);
    
    // Check if user has premium entitlement active in RevenueCat
    const isPremium = customerInfo.entitlements.active["premium"] !== undefined;
    if (isPremium) {
      // Sync status with our backend db
      const response = await api.post("/payments/verify-purchase", {
        plan: planId,
        is_mock: false,
        revenuecat_customer_id: customerInfo.originalAppUserId,
      });
      return response.data;
    } else {
      throw new Error("Purchase completed but premium entitlement is not active.");
    }
  } catch (err) {
    if (err.userCancelled) {
      console.log("[RevenueCat] User cancelled purchase");
      return { status: "cancelled" };
    }
    throw err;
  }
};
