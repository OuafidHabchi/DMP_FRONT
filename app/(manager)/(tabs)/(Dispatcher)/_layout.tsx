import { Drawer } from "expo-router/drawer";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { useUser } from "@/context/UserContext";

export default function DispatcherLayout() {
  const { user } = useUser(); // ✅ Récupérer l'utilisateur

  // Fonction pour obtenir le titre selon la langue de l'utilisateur
  const getTitle = (fr: string, en: string) => (user?.language === "Français" ? fr : en);

  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        drawerStyle: {
          backgroundColor: "#001933", // Bleu foncé
          width: 280,
        },
        drawerActiveTintColor: "#FFF", // Blanc pour l’onglet actif
        drawerInactiveTintColor: "#A0A0A0", // Gris clair pour les inactifs
        drawerActiveBackgroundColor: "rgba(255, 255, 255, 0.15)", // Légère transparence pour l'onglet actif
        headerStyle: {
          backgroundColor: "#001933",
        },
        headerTintColor: "#FFF",
      }}
      drawerContent={(props) => (
        <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContainer}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            {/* ✅ Section utilisateur stylisée */}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name} {user?.familyName}</Text>
              <Text style={styles.userRole}>{user?.role}</Text>
            </View>

            {/* ✅ Liste des éléments du menu */}
            <DrawerItemList {...props} />
          </ScrollView>
        </DrawerContentScrollView>
      )}
    >
      <Drawer.Screen name="Confirmation" options={{ title: getTitle("Suivi des confirmations", "Confirmation Tracking") }} />
      <Drawer.Screen name="VanAssignment" options={{ title: getTitle("Assignation Van", "Van Assignment") }} />
      <Drawer.Screen name="TimeCard" options={{ title: getTitle("Fiches de Temps", "Time Cards") }} />
      <Drawer.Screen name="DailyInfractions" options={{ title: getTitle("Violations Quotidiennes", "Daily Violation ") }} />
      <Drawer.Screen name="CortexPrediction" options={{ title: getTitle("Prédiction Cortex", "Cortex Prediction") }} />
      <Drawer.Screen name="ExtratRoutes" options={{ title: getTitle("Routes Extra", "Extra Routes") }} />
      <Drawer.Screen name="Inventory" options={{ title: getTitle("Inventaire", "Inventory") }} />
      <Drawer.Screen name="WeeklyRecap" options={{ title: getTitle("Récapitulatif Semaine", "Weekly Recap") }} />

      
     
      
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flexGrow: 1, // Permet de bien occuper l’espace
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20, // Ajoute de l’espace en bas pour éviter la coupure
  },
  userInfo: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    backgroundColor: "#002A4D", // Bleu légèrement plus clair
    marginBottom: 10,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },
  userRole: {
    fontSize: 14,
    color: "#A0A0A0",
  },
});
