import { Drawer } from "expo-router/drawer";
import { View, Text, StyleSheet } from "react-native";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { useUser } from "@/context/UserContext";

// ✅ Fonction pour obtenir la couleur du ScoreCard
const getScoreColor = (score :any) => {
  switch (score) {
    case 'Fantastic':
      return '#ADD8E6'; // Light blue
    case 'Great':
      return '#90EE90'; // Light green
    case 'Fair':
      return '#ffcc00'; // Yellow
    case 'Poor':
      return '#ff3333'; // Red
    default:
      return '#808080'; // Default gray
  }
};

export default function EmployeLayout() {
  const { user } = useUser(); // ✅ Récupérer l'utilisateur

  // Fonction pour obtenir le titre selon la langue de l'utilisateur
  const getTitle = (fr :any, en :any) => (user?.language === "Français" ? fr : en);

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
            <Text style={styles.userName}>
              Hello, {user?.name}
            </Text>
            {/* ✅ Affiche la valeur de scoreCard avec couleur dynamique */}
            <Text style={styles.userName}>
              Score Card:{" "}
              <Text style={{ color: getScoreColor(user?.scoreCard), fontWeight: 'bold' }}>
                {user?.scoreCard ?? "N/A"}
              </Text>
            </Text>
          </View>

          {/* ✅ Liste des éléments du menu */}
          <DrawerItemList {...props} />
        </DrawerContentScrollView>
      )}
    >
      <Drawer.Screen name="AcceuilEmployee" options={{ title: getTitle("Accueil", "Home") }} />
      <Drawer.Screen name="AssignedVanScreen" options={{ title: getTitle("Van Assigné", "Assigned Van") }} />
      <Drawer.Screen name="Disponibilites" options={{ title: getTitle("Disponibilités", "Availability") }} />
      <Drawer.Screen name="Violations" options={{ title: getTitle("Violations", "Violations") }} />
      <Drawer.Screen name="EmployeeWarnings" options={{ title: getTitle("Avertissements", "Warnings") }} />
      <Drawer.Screen name="ExtraRoadEmployee" options={{ title: getTitle("Routes Extra", "Extra Routes") }} />
      <Drawer.Screen name="ProcedureEmployee" options={{ title: getTitle("Procédures", "Procedures") }} />
      <Drawer.Screen name="Quiz" options={{ title: getTitle("Quiz", "Quiz") }} />
      <Drawer.Screen name="Profile" options={{ title: getTitle("Profil", "Profile") }} />

      {/* 🔴 Sign Out avec couleur rouge uniquement */}
      <Drawer.Screen
        name="SignOut"
        options={{
          title: getTitle("Déconnexion", "Sign Out"),
          drawerLabelStyle: styles.signOutLabel, // Applique le rouge
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flexGrow: 1, // Permet d'occuper toute la hauteur
    paddingBottom: 10,
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
  signOutLabel: {
    color: "#FF4D4D", // Rouge vif uniquement sur Sign Out
    fontWeight: "bold",
    fontSize: 16,
  },
});
