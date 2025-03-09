import { Drawer } from "expo-router/drawer";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { useUser } from "@/context/UserContext";

export default function RHLayout() {
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
      <Drawer.Screen name="AllEmployees" options={{ title: getTitle("Chauffeurs", "Drivers") }} />
      <Drawer.Screen name="EmployeesAvaibilities" options={{ title: getTitle("Disponibilité Équipe", "Team Availability") }} />
      <Drawer.Screen name="Warnings" options={{ title: getTitle("Avertissements", "Warnings") }} />
      <Drawer.Screen name="Procedure" options={{ title: getTitle("Procédures", "Procedures") }} />
      <Drawer.Screen name="CortexVsDa" options={{ title: getTitle("Cortex vs Chauffeur", "Cortex vs Driver") }} />
      <Drawer.Screen name="shifts" options={{ title: getTitle("Shifts", "Shifts") }} />
      <Drawer.Screen name="WeeklyScroreCard" options={{ title: getTitle("Score Card Hebdo", "Weekly Score Card") }} />
      <Drawer.Screen name="WeeklyStatistics" options={{ title: getTitle("Violations Hebdo", "Weekly Violation") }} />
      <Drawer.Screen name="QuizManagement" options={{ title: getTitle("Gestion Quiz", "Quiz Management") }} />
      <Drawer.Screen name="AgendaComponent" options={{ title: getTitle("Agenda", "Agenda") }} />
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
