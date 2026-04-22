import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/store";
import { useAuthStore } from "@/store";

// ── Screens ────────────────────────────────────────────────────────────────────
import { LoginScreen } from "@/screens/LoginScreen";
import { OnboardingScreen } from "@/screens/OnboardingScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { ReunionsScreen } from "@/screens/ReunionsScreen";
import { GenerateursScreen } from "@/screens/GenerateursScreen";
import { ProfilScreen } from "@/screens/ProfilScreen";
import { AbonnementScreen } from "@/screens/AbonnementScreen";
import { EmploiScreen, MarchesScreen, EnquetesScreen } from "@/screens";

// ── Stacks ────────────────────────────────────────────────────────────────────

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator (App principale)
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarStyle: {
        backgroundColor: "#111827",
        borderTopColor: "#1F2937",
        borderTopWidth: 1,
        height: 60,
        paddingBottom: 8,
        paddingTop: 6,
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textMuted,
      tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      headerShown: false,
      tabBarIcon: ({ color, focused, size }) => {
        const icons: Record<string, string> = {
          Dashboard:   focused ? "grid"                    : "grid-outline",
          YukpoIA:     focused ? "chatbubble-ellipses"     : "chatbubble-ellipses-outline",
          Reunions:    focused ? "people"                  : "people-outline",
          Enquetes:    focused ? "analytics"               : "analytics-outline",
          Emploi:      focused ? "briefcase"               : "briefcase-outline",
          Marches:     focused ? "hammer"                  : "hammer-outline",
          Generateurs: focused ? "folder-open"             : "folder-open-outline",
          Abonnement:  focused ? "card"                    : "card-outline",
          Profil:      focused ? "person-circle"           : "person-circle-outline",
        };
        return <Ionicons name={icons[route.name] as keyof typeof Ionicons.glyphMap} size={size - 2} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Dashboard"   component={DashboardScreen}   options={{ tabBarLabel: "Accueil" }} />
    <Tab.Screen name="YukpoIA"     component={ChatScreen}        options={{ tabBarLabel: "Yukpo Pro" }} />
    <Tab.Screen name="Reunions"    component={ReunionsScreen}    options={{ tabBarLabel: "Réunions" }} />
    <Tab.Screen name="Enquetes"    component={EnquetesScreen}    options={{ tabBarLabel: "Enquêtes" }} />
    <Tab.Screen name="Emploi"      component={EmploiScreen}      options={{ tabBarLabel: "Emploi" }} />
    <Tab.Screen name="Marches"     component={MarchesScreen}     options={{ tabBarLabel: "Marchés" }} />
    <Tab.Screen name="Generateurs" component={GenerateursScreen} options={{ tabBarLabel: "Docs" }} />
    <Tab.Screen name="Abonnement"  component={AbonnementScreen}  options={{ tabBarLabel: "Plan" }} />
    <Tab.Screen name="Profil"      component={ProfilScreen}      options={{ tabBarLabel: "Profil" }} />
  </Tab.Navigator>
);

// Root Navigator
export const RootNavigator = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login"      component={LoginScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
