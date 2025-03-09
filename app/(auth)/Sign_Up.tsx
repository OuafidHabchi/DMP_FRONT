import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import Name from '@/components/src/Sign_Up/Name';
import FamilyName from '@/components/src/Sign_Up/FamilyName';
import Email from '@/components/src/Sign_Up/Email';
import Tel from '@/components/src/Sign_Up/Tel';
import PassWord from '@/components/src/Sign_Up/Password';
import Confirmation from '@/components/src/Sign_Up/Confirmation';
import Language from '@/components/src/Sign_Up/language';
import axios from 'axios';
import { useRouter, useLocalSearchParams } from 'expo-router';  // ✅ Correct hook
import AppURL from '@/components/src/URL';
import { useNotification } from '@/context/NotificationContext';
import { useUser } from '@/context/UserContext';

const Sign_Up: React.FC = () => {
  const { saveUser } = useUser();
  const router = useRouter();
  const { expoPushToken } = useNotification();
  const { code, invitationId } = useLocalSearchParams();  // ✅ Get the dsp_code from the URL
  const [isInvitationValid, setIsInvitationValid] = useState(false);
  const [invitationChecked, setInvitationChecked] = useState(false);
  const [inputstate, setInputstate] = useState({
    name: '',
    familyName: '',
    email: '',
    tel: '',
    password: '',
    confirmation: '',
    Language: ''
  });

  const [showValidation, setShowValidation] = useState({
    name: false,
    familyName: false,
    email: false,
    tel: false,
    password: false,
    confirmation: false,
    Language: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');



  const validateFields = () => {
    const isValid = {
      name: inputstate.name.length >= 3 && inputstate.name.length <= 64,
      familyName: inputstate.familyName.length >= 3 && inputstate.familyName.length <= 64,
      email: inputstate.email.includes('@'),
      tel: inputstate.tel.length >= 10,
      password: inputstate.password.length >= 6 && /\d/.test(inputstate.password),
      confirmation: inputstate.confirmation === inputstate.password,
      Language: inputstate.Language.length > 0
    };

    setShowValidation({
      name: !isValid.name,
      familyName: !isValid.familyName,
      email: !isValid.email,
      tel: !isValid.tel,
      password: !isValid.password,
      confirmation: !isValid.confirmation,
      Language: !isValid.Language
    });

    return Object.values(isValid).every(Boolean);
  };
 
  useEffect(() => {
    const checkInvitation = async () => {

      try {
        if (invitationId && code) {
          const response = await axios.get(`${AppURL}/api/invitations/check/${invitationId}?dsp_code=${code}`);
          if (response.data.status) {
            setIsInvitationValid(true);
          } else {
            setIsInvitationValid(false);
          }
        } else {
        }
      } catch (error) {
        setIsInvitationValid(false);
      } finally {
        setInvitationChecked(true);
      }
    };

    checkInvitation();
  }, [invitationId, code]);



  const handleRegister = async () => {
    if (!validateFields()) {
      return;
    }

    if (!expoPushToken) {
      Alert.alert('Notification setup is incomplete. Please try again later.');
      return;
    }

    setIsLoading(true);

    const newUser = {
      name: inputstate.name,
      familyName: inputstate.familyName,
      tel: inputstate.tel,
      email: inputstate.email.toLowerCase(),
      password: inputstate.password,
      language: inputstate.Language,
      dsp_code: code,  // ✅ Use dsp_code from URL
      role: 'driver',
      scoreCard: 'New DA',
      expoPushToken,
      invitationId
    };

    try {
      const response = await axios.post(`${AppURL}/api/employee/register?dsp_code=${code}`, newUser);
      setSuccessMessage('Your account has been successfully created.');
      Alert.alert('Success', 'Your account has been created.');

      const data = response.data;
      const userId = data._id;
      const userDspCode = data.dsp_code;
      saveUser(userId, userDspCode);

      router.push("/(driver)/(tabs)/(Employe)/AcceuilEmployee");

    } catch (error) {
      if (axios.isAxiosError(error)) {
        setServerError(error.response?.data?.message || 'An error occurred.');
      } else {
        setServerError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!invitationChecked ? (
        // 🔄 Loader pendant la vérification
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#001933" />
        </View>
      ) : !isInvitationValid ? (
        // ❌ Message d'erreur si l'invitation n'est pas fonctionnelle
        <View style={styles.container}>
          <Text style={styles.errorText}>
            This invitation has already been used or deleted. Please ask your manager to send you a new one.
          </Text>
        </View>
      ) : (
        // ✅ Formulaire d'inscription si l'invitation est valide
        <ScrollView contentContainerStyle={Platform.OS === 'web' ? styles.scrollContainerWeb : styles.scrollContainer}>
          <View style={styles.container}>
            <Text style={styles.title}>Create an Account</Text>

            {successMessage ? <Text style={styles.successMessage}>{successMessage}</Text> : null}
            {serverError ? <Text style={styles.errorText}>{serverError}</Text> : null}

            <View style={styles.form}>
              <Name inputstate={inputstate} setinputstate={setInputstate} showValidation={showValidation} />
              <FamilyName inputstate={inputstate} setinputstate={setInputstate} showValidation={showValidation} />
              <Email inputstate={inputstate} setinputstate={setInputstate} />
              <Tel inputstate={inputstate} setinputstate={setInputstate} />
              <PassWord inputstate={inputstate} setinputstate={setInputstate} showValidation={showValidation} />
              <Confirmation inputstate={inputstate} setinputstate={setInputstate} showValidation={showValidation} />
              <Language inputstate={inputstate} setinputstate={setInputstate} showValidation={showValidation} />
            </View>

            {isLoading ? (
              <ActivityIndicator size="large" color="#ffffff" />
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleRegister}>
                <Text style={styles.buttonText1}>Sign Up</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}
    </>
  );


};

export default Sign_Up;


const styles = StyleSheet.create({
  scrollContainerWeb: {
    justifyContent: 'center',
    paddingVertical: 20,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#001933',
  },
  button: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText1: {
    color: '#001933',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupButton: {
    backgroundColor: '#6C757D',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
    fontSize: 24,
  },
  successMessage: {
    color: 'green',
    marginTop: 10,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#ffffff',
  },
  form: {
    marginBottom: 20,
  },
});
