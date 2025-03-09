import { Drawer } from "expo-router/drawer";
import { View, Text, StyleSheet } from "react-native";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { useUser } from "@/context/UserContext";

export default function FleetLayout() {
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
        drawerActiveBackgroundColor: "rgba(255, 255, 255, 0.15)", // Effet de surbrillance doux
        headerStyle: {
          backgroundColor: "#001933",
        },
        headerTintColor: "#FFF",
      }}
      drawerContent={(props) => (
        <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContainer}>
          {/* ✅ Section utilisateur stylisée */}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name} {user?.familyName}</Text>
            <Text style={styles.userRole}>{user?.role}</Text>
          </View>

          {/* ✅ Liste des éléments du menu */}
          <DrawerItemList {...props} />
        </DrawerContentScrollView>
      )}
    >
      <Drawer.Screen name="DailyRecapFleet" options={{ title: getTitle("Véhicules du Jour", "Daily Vehicle Usage") }} />
      <Drawer.Screen name="ReportIssues" options={{ title: getTitle("Signaler Problèmes", "Report Issues") }} />
      <Drawer.Screen name="AllVans" options={{ title: getTitle("Véhicules", "Vehicles") }} />
      <Drawer.Screen name="Phones" options={{ title: getTitle("Téléphones", "Phones") }} />
      <Drawer.Screen name="PowerBanks" options={{ title: getTitle("Batteries Externes", "Power Banks") }} />
      <Drawer.Screen name="ClothesManagment" options={{ title: getTitle("Gestion Vêtements", "Clothes Management") }} />
      <Drawer.Screen name="Statut" options={{ title: getTitle("Statut", "Status") }} />

    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    paddingTop: 10,
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
