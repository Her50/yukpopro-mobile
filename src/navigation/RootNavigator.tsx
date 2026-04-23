import React from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useThemeStore } from "@/store";
import { useAuthStore } from "@/store";

// ── Screens ────────────────────────────────────────────────────────────────────
import { LoginScreen } from "@/screens/LoginScreen";
import { OnboardingScreen } from "@/screens/OnboardingScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { ReunionsScreen } from "@/screens/ReunionsScreen";
import { TranslateLiveScreen } from "@/screens/TranslateLiveScreen";
import { GenerateursScreen } from "@/screens/GenerateursScreen";
import { ProfilScreen } from "@/screens/ProfilScreen";
import { AbonnementScreen } from "@/screens/AbonnementScreen";
import { EmploiScreen, MarchesScreen, EnquetesScreen, TraductionScreen, DocumentsScreen, AdminScreen } from "@/screens";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const C = useColors();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: {
          backgroundColor: C.bgSurface,
          borderTopColor: C.bgCardBorder,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        headerShown: false,
        tabBarIcon: ({ color, focused, size }) => {
          const icons: Record<string, string> = {
            Dashboard:   focused ? "grid"                    : "grid-outline",
            YukpoIA:     focused ? "chatbubble-ellipses"     : "chatbubble-ellipses-outline",
            Reunions:    focused ? "people"                  : "people-outline",
            Translate:   focused ? "radio"                   : "radio-outline",
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
      <Tab.Screen name="Translate"   component={TranslateLiveScreen} options={{ tabBarLabel: "Live" }} />
      <Tab.Screen name="Enquetes"    component={EnquetesScreen}    options={{ tabBarLabel: "Enquêtes" }} />
      <Tab.Screen name="Emploi"      component={EmploiScreen}      options={{ tabBarLabel: "Emploi" }} />
      <Tab.Screen name="Marches"     component={MarchesScreen}     options={{ tabBarLabel: "Marchés" }} />
      <Tab.Screen name="Generateurs" component={GenerateursScreen} options={{ tabBarLabel: "Docs" }} />
      <Tab.Screen name="Abonnement"  component={AbonnementScreen}  options={{ tabBarLabel: "Plan" }} />
      <Tab.Screen name="Profil"      component={ProfilScreen}      options={{ tabBarLabel: "Profil" }} />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  const { isAuthenticated } = useAuthStore();
  const theme = useThemeStore((s) => s.theme);
  const C = useColors();
  const navTheme = theme === "dark"
    ? { ...DarkTheme,    colors: { ...DarkTheme.colors,    background: C.bg, card: C.bgSurface, text: C.textPrimary, border: C.bgCardBorder, primary: C.primary } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.bg, card: C.bgSurface, text: C.textPrimary, border: C.bgCardBorder, primary: C.primary } };

  // key={theme} force un remount complet du tree nav lors du toggle
  // → toutes les screens se re-montent avec les nouvelles couleurs
  //   (les StyleSheet module-level lisent COLORS muté par setTheme).
  return (
    <NavigationContainer key={theme} theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login"      component={LoginScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main"        component={MainTabs} />
            <Stack.Screen name="Traduction"  component={TraductionScreen} options={{ headerShown: true, title: "Traduction" }} />
            <Stack.Screen name="Documents"   component={DocumentsScreen}  options={{ headerShown: true, title: "Mes Documents" }} />
            <Stack.Screen name="Admin"       component={AdminScreen}      options={{ headerShown: true, title: "Admin" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
