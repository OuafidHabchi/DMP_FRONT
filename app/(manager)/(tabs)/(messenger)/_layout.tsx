import { useUser } from "@/context/UserContext";
import { Stack } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

export default function Layout() {
  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte

  if (loadingContext) return null; // Attendre le chargement du contexte

  // Fonction pour obtenir le titre selon la langue de l'utilisateur
  const getTitle = (fr: string, en: string) => (user?.language === "Français" ? fr : en);

  return (
    <Stack 
      screenOptions={{
        headerStyle: styles.header, // Applique le style du header
        headerTintColor: "#FFF", // Couleur du texte du header
        headerTitleAlign: "center", // Centrage du titre
        headerTitleStyle: styles.headerTitle, // Style du titre
      }}
    >
      <Stack.Screen 
        name="Messenger" 
        options={{ title: getTitle("Messagerie", "Messenger") }} 
      />
      <Stack.Screen 
        name="Chat" 
        options={{ title: getTitle("Chat", "Chat"), headerShown: true }} 
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#001933", // Bleu foncé cohérent avec les autres Layouts
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
