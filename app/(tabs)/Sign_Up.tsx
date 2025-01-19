import React, { useState } from 'react';
import { Text, View, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import Name from '@/components/src/Sign_Up/Name';
import FamilyName from '@/components/src/Sign_Up/FamilyName';
import Email from '@/components/src/Sign_Up/Email';
import Tel from '@/components/src/Sign_Up/Tel';
import PassWord from '@/components/src/Sign_Up/Password';
import Confirmation from '@/components/src/Sign_Up/Confirmation';
import Dsp_Code from '@/components/src/Sign_Up/Dsp_Code'; // Import Dsp_Code Component
import Language from '@/components/src/Sign_Up/language';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from './_layout';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import AppURL from '@/components/src/URL';

type Sign_UpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Sign_Up'>;

const Sign_Up: React.FC = () => {
  const navigation = useNavigation<Sign_UpScreenNavigationProp>();
  const [inputstate, setinputstate] = useState({
    name: '',
    familyName: '',
    email: '',
    tel: '',
    password: '',
    confirmation: '',
    Language: '', // Added Language
    Dsp_Code: '', // Added Dsp_Code
  });

  const [showValidation, setshowvalidation] = useState({
    name: false,
    familyName: false,
    email: false,
    tel: false,
    password: false,
    confirmation: false,
    Language: false, // Added Language Validation
    Dsp_Code: false, // Added Dsp_Code Validation
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [serverError, setServerError] = useState('');

  
  const registerForPushNotificationsAsync = async () => {
    let token;

    // Request permissions for notifications
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Ask for permissions if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // If permissions are not granted, exit
    if (finalStatus !== 'granted') {
      Alert.alert('Failed to get push token for push notifications!');
      return null;
    }

    // Get the push token for iOS or Android
    token = (await Notifications.getExpoPushTokenAsync()).data;

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    console.log('Expo Push Token:', token);
    return token;
  };

  const checkvalidation = () => {
    const AreValide = {
      name: inputstate.name.length >= 3 && inputstate.name.length <= 64,
      familyName: inputstate.familyName.length >= 3 && inputstate.familyName.length <= 64,
      email: inputstate.email.includes('@'),
      tel: inputstate.tel.length >= 10,
      password: inputstate.password.length >= 6 && /\d/.test(inputstate.password),
      confirmation: inputstate.confirmation === inputstate.password,
      Language: inputstate.Language.length > 0,
      Dsp_Code: inputstate.Dsp_Code.length === 5,
    };
  
    console.log('Validation Results:', AreValide);
  
    setshowvalidation({
      name: !AreValide.name,
      familyName: !AreValide.familyName,
      email: !AreValide.email,
      tel: !AreValide.tel,
      password: !AreValide.password,
      confirmation: !AreValide.confirmation,
      Language: !AreValide.Language,
      Dsp_Code: !AreValide.Dsp_Code,
    });
  
    return Object.values(AreValide).every((valid) => valid);
  };
  

  const handleSubmit = async () => {
    console.log('Submit clicked');

    if (!checkvalidation()) {
      console.log('Validation failed');
      return;
    }

    
    let expoPushToken = null;

    // Récupérer le token uniquement si la plateforme n'est pas 'web'
    if (Platform.OS !== 'web') {
      expoPushToken = await registerForPushNotificationsAsync();
      if (!expoPushToken) {
        console.log('Failed to get Expo push token');
        return;
      }
    }
  

    const nouvelUtilisateur = {
      name: inputstate.name,
      familyName: inputstate.familyName,
      tel: inputstate.tel,
      email: inputstate.email.toLowerCase(), // Convert email to lowercase
      password: inputstate.password,
      language: inputstate.Language, // Added Language
      dsp_code: inputstate.Dsp_Code, // Added Dsp_Code
      role: 'driver',
      scoreCard: 'New DA',
      expoPushToken,
    };

    console.log('New User Data:', nouvelUtilisateur);

    try {
      const response = await axios.post(`${AppURL}/api/employee/register`, nouvelUtilisateur);
      console.log('Server Response:', response.data);
      setSuccessMessage('Account created successfully.');
      Alert.alert('Your account has been created.');
      navigation.navigate('Sign_In');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // If the error is an Axios error, you can safely access `error.response`
        console.log('API Error:', error.response?.data || error.message);
        setServerError(error.response?.data?.message || 'An error occurred. Please try again.');
      } else {
        // For non-Axios errors, log a generic message
        console.log('Unknown Error:', error);
        setServerError('An unexpected error occurred. Please try again.');
      }
    }    
  };


  return (
    <ScrollView contentContainerStyle={Platform.OS === 'web' ? commonStyles.scrollContainerWeb : commonStyles.scrollContainer}>
      <View style={commonStyles.container}>
        <Text style={commonStyles.title}>Create Account</Text>
        {successMessage ? <Text style={commonStyles.successMessage}>{successMessage}</Text> : null}
        {serverError ? <Text style={commonStyles.errorText}>{serverError}</Text> : null}
        <View style={commonStyles.form}>
          <Name inputstate={inputstate} setinputstate={setinputstate} showValidation={showValidation} />
          <FamilyName inputstate={inputstate} setinputstate={setinputstate} showValidation={showValidation} />
          <Email inputstate={inputstate} setinputstate={setinputstate} />
          <Tel inputstate={inputstate} setinputstate={setinputstate} />
          <PassWord inputstate={inputstate} setinputstate={setinputstate} showValidation={showValidation} />
          <Confirmation inputstate={inputstate} setinputstate={setinputstate} showValidation={showValidation} />
          <Language inputstate={inputstate} setinputstate={setinputstate} showValidation={showValidation} />
          <Dsp_Code inputstate={inputstate} setinputstate={setinputstate} showValidation={showValidation} />
        </View>
        <TouchableOpacity style={commonStyles.button} onPress={handleSubmit}>
          <Text style={commonStyles.buttonText1}>Submit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={commonStyles.signupButton} onPress={() => navigation.navigate('Sign_In')}>
          <Text style={commonStyles.buttonText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default Sign_Up;

const commonStyles = StyleSheet.create({
  buttonText1: {
    color: '#001933',
    fontSize: 16,
    fontWeight: 'bold',
  },
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
    color: 'ffffff',
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
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
