import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@/context/UserContext";
import { View, Animated, Easing } from "react-native";
import { useEffect, useRef } from "react";

type TabIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  focused: boolean;
};

export default function Layout() {
  const { user, loadingContext } = useUser();
  if (loadingContext) return null;

  // Fonction pour obtenir le titre selon la langue de l'utilisateur
  const getTitle = (fr: string, en: string) => (user?.language === "Français" ? fr : en);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#001933",
          borderTopWidth: 0,
          height: 65,
          paddingBottom: 10,
          paddingTop: 5,
        },
        tabBarActiveTintColor: "#FFF", // Blanc pour l'onglet actif
        tabBarInactiveTintColor: "#A0A0A0", // Gris clair pour inactifs
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "bold",
        },
      }}
    >
      <Tabs.Screen
        name="(tabs)/(accueil)"
        options={{
          title: getTitle("Accueil", "Home"),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="home" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/(RH)"
        options={{
          title: getTitle("RH", "HR"),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="briefcase" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/(Dispatcher)"
        options={{
          title: getTitle("Dispatch", "Dispatcher"),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="clipboard" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/(Fleet)"
        options={{
          title: getTitle("Flotte", "Fleet"),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="car" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/(messenger)"
        options={{
          title: getTitle("Messagerie", "Messenger"),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="chatbubbles" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const TabIcon = ({ name, color, size, focused }: TabIconProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const underlineAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: focused ? 1.1 : 1,
      duration: 150,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();

    Animated.timing(underlineAnim, {
      toValue: focused ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  return (
    <View style={{ alignItems: "center" }}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons name={name} size={size} color={color} />
      </Animated.View>
      <Animated.View
        style={{
          height: 3,
          width: focused ? 20 : 0,
          backgroundColor: "#FFF",
          borderRadius: 2,
          marginTop: 5,
          opacity: underlineAnim,
        }}
      />
    </View>
  );
};
