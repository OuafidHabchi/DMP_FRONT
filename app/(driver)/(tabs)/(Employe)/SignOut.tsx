import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@/context/UserContext";

const SignOut: React.FC = () => {
  const router = useRouter();
  const { logout, user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  // 🗨️ Multilingue selon la langue de l'utilisateur
  const confirmMessage = user?.language === 'English'
    ? 'Are you sure you want to log out? '
    : 'Voulez-vous vraiment vous déconnecter ? ';
  const confirmYes = user?.language === 'English' ? 'Yes' : 'Oui';
  const confirmNo = user?.language === 'English' ? 'No' : 'Non';
  const loadingMessage = user?.language === 'English'
    ? 'Logging out... 😭'
    : 'Déconnexion en cours... 😭';
  const cancelMessage = user?.language === 'English'
    ? 'Good choice! 😊 Returning to home...'
    : 'Bon choix ! 😊 Retour à l\'accueil...';

  // ✅ Fonction de déconnexion avec délai
  const handleConfirmLogout = async () => {
    setShowMessage(true);
    setCustomMessage(loadingMessage);
    setTimeout(async () => {
      await logout();
      setShowMessage(false); // ✅ Réinitialisation après la redirection
      router.replace("/(auth)/Sign_In");
    }, 1000); // ✅ 2 secondes avant redirection
  };

  // ❌ Redirection vers Accueil avec délai et message
  const handleCancel = () => {
    setShowMessage(true);
    setCustomMessage(cancelMessage);
    setTimeout(() => {
      setShowMessage(false); // ✅ Réinitialisation après la redirection
      router.replace("/(driver)/(tabs)/(Employe)/AcceuilEmployee");
    }, 1000); // ✅ 2 secondes avant redirection
  };


  // 🟡 Interface utilisateur
  return (
    <View style={styles.container}>
      {showMessage ? (
        <>
          {isLoading && <ActivityIndicator size="large" color="#ffffff" />}
          <Text style={styles.loadingText}>{customMessage}</Text>
        </>
      ) : (
        <>
          <Text style={styles.emoji}>😰</Text>
          <Text style={styles.confirmText}>{confirmMessage}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonYes]}
              onPress={handleConfirmLogout}
            >
              <Text style={styles.buttonText}>{confirmYes}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonNo]}
              onPress={handleCancel}
            >
              <Text style={styles.buttonText}>{confirmNo}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

export default SignOut;

// 💅 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#001933",
  },
  emoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  confirmText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 20,
    textAlign: "center",
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonYes: {
    backgroundColor: "#28a745", // Vert
  },
  buttonNo: {
    backgroundColor: "#dc3545", // Rouge
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});
