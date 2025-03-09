import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import Email from "@/components/src/Sign_In/Email";
import PassWord from "@/components/src/Sign_In/PassWord";
import Dsp_Code from "@/components/src/Sign_In/Dsp_Code";
import axios from "axios";
import { useRouter } from "expo-router";
import { useUser } from "@/context/UserContext";  // 🚀 Importation du UserContext
import AppURL from "@/components/src/URL";
import { useNotification } from '@/context/NotificationContext';


const Sign_In: React.FC = () => {
  const router = useRouter();
  const { expoPushToken } = useNotification();
  const { saveUser } = useUser(); // ✅ Utilisation de `saveUser` au lieu de `setUser`
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inputstate, setInputstate] = useState({
    email: "",
    password: "",
    Dsp_Code: "",
  });

  const validateFields = () => {
    if (!inputstate.email || !inputstate.password || !inputstate.Dsp_Code) {
      setServerError("All fields are required.");
      return false;
    }
    if (!inputstate.email.includes("@")) {
      setServerError("Please enter a valid email address.");
      return false;
    }
    if (inputstate.password.length < 6) {
      setServerError("The password must be at least 6 characters long.");
      return false;
    }
    if (inputstate.Dsp_Code.length !== 5) {
      setServerError("The DSP code must be exactly 5 characters long.");
      return false;
    }
    return true;
  };



  const handleLogin = async (email: string, password: string, dspCode: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${AppURL}/api/employee/login`, {
        email: email.toLowerCase(),
        password,
        dsp_code: dspCode.toLowerCase(),
        expoPushToken,
      });

      const data = response.data;
      const userId = data._id;
      const userDspCode = data.dsp_code;

      // ✅ Sauvegarde uniquement de l'ID et du DSP_CODE
      await saveUser(userId, userDspCode);

      // ✅ Redirection selon le rôle
      if (data.role === "manager") {
        router.replace("/(manager)/(tabs)/(accueil)/Accueil");
      } else if (data.role === "driver") {
        router.replace("/(driver)/(tabs)/(Employe)/AcceuilEmployee");
      } else {
        setServerError("Unknown role. Please contact an administrator.");
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        setServerError(error.response.data.message || "An error occurred. Please try again.");
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };




  const handleSubmit = async () => {
    if (!validateFields()) {
      return;
    }
    await handleLogin(inputstate.email, inputstate.password, inputstate.Dsp_Code);
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#ffffff" />
      ) : (
        <>
          <Text style={styles.title}>CONNEXION</Text>
          <Email inputstate={inputstate} setinputstate={setInputstate} />
          <PassWord inputstate={inputstate} setinputstate={setInputstate} />
          <Dsp_Code inputstate={inputstate} setinputstate={setInputstate} />

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
          {serverError ? <Text style={styles.errorText}>{serverError}</Text> : null}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#ffffff",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#001933",
  },
  button: {
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginVertical: 10,
  },
  buttonText: {
    color: "#001933",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonText2: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  signupButton: {
    backgroundColor: "#6C757D",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginVertical: 10,
  },
  errorText: {
    color: "#ff4d4d",
    marginTop: 10,
    textAlign: "center",
  },
});

export default Sign_In;
