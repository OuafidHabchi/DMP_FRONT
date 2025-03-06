import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@/context/UserContext";

export default function DriverLayout() {
  const { user } = useUser(); // ✅ Récupérer l'utilisateur

  // Fonction pour obtenir le titre selon la langue de l'utilisateur
  const getTitle = (fr: string, en: string) => (user?.language === "Français" ? fr : en);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#001933", // Bleu foncé pour la barre de navigation
          borderTopWidth: 0,
          height: 65,
          paddingBottom: 10,
          paddingTop: 5,
        },
        tabBarActiveTintColor: "#FFF", // Blanc pour l’onglet actif
        tabBarInactiveTintColor: "#A0A0A0", // Gris clair pour les inactifs
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "bold",
        },
      }}
    >
      <Tabs.Screen
        name="(tabs)/(Employe)"
        options={{
          title: getTitle("Employé", "Employee"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/(messenger)"
        options={{
          title: getTitle("Messagerie", "Messenger"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/Dispatche"
        options={{
          title: getTitle("Dispatch", "Dispatch"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard" size={size} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}
