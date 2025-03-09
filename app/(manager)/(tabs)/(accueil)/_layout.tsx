import { Drawer } from "expo-router/drawer";
import { View, Text, StyleSheet } from "react-native";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { useUser } from "@/context/UserContext";

export default function Layout() {
  const { user } = useUser();

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
          {/* ✅ Section utilisateur stylisée */}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name} {user?.familyName}</Text>
            <Text style={styles.userRole}>{user?.role}</Text>
          </View>

          {/* ✅ Liste des éléments du menu */}
          <DrawerItemList {...props} />

          <View style={styles.separator} />
        </DrawerContentScrollView>
      )}
    >
      <Drawer.Screen name="Accueil" options={{ title: getTitle("Accueil", "Home") }} />
      <Drawer.Screen name="Profile" options={{ title: getTitle("Profil", "Profile") }} />
      <Drawer.Screen name="Contact" options={{ title: getTitle("Contactez-nous", "Contact Us") }}/>

      <Drawer.Screen
        name="SignOut"
        options={{
          title: getTitle("Déconnexion", "Sign Out"),
          drawerLabelStyle: { color: "#FF4D4D", fontWeight: "bold", fontSize: 16 }, // Rouge vif
        }}
      />
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
  separator: {
    height: 1,
    backgroundColor: "#A0A0A0",
    marginVertical: 10,
    marginHorizontal: 20,
  },
});
