import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Email from '@/components/src/Sign_In/Email';
import PassWord from '@/components/src/Sign_In/PassWord';
import Dsp_Code from '@/components/src/Sign_In/Dsp_Code';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from './_layout';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AppURL from '@/components/src/URL';

type Sign_InScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Sign_In'>;

const Sign_In: React.FC = () => {
  const navigation = useNavigation<Sign_InScreenNavigationProp>();

  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // État pour gérer le chargement
  const [inputstate, setinputstate] = useState({
    email: '',
    password: '',
    Dsp_Code: '',
  });

  useEffect(() => {
    const checkAutoLogin = async () => {
      setIsLoading(true); // Début du chargement
      try {
        const savedEmail = await AsyncStorage.getItem('email');
        const savedPassword = await AsyncStorage.getItem('password');
        const savedDspCode = await AsyncStorage.getItem('Dsp_Code');

        if (savedEmail && savedPassword && savedDspCode) {
          await handleAutoLogin(savedEmail, savedPassword, savedDspCode);
        }
      } catch (error) {
        console.error('Error checking auto-login:', error);
      } finally {
        setIsLoading(false); // Fin du chargement
      }
    };

    checkAutoLogin();
  }, []);

  const validateFields = () => {
    if (!inputstate.email || !inputstate.password || !inputstate.Dsp_Code) {
      setServerError('All fields are required.');
      return false;
    }
    if (!inputstate.email.includes('@')) {
      setServerError('Please enter a valid email address.');
      return false;
    }
    if (inputstate.password.length < 6) {
      setServerError('Password must be at least 6 characters long.');
      return false;
    }
    if (inputstate.Dsp_Code.length !== 5) {
      setServerError('DSP Code must be exactly 5 characters.');
      return false;
    }
    return true;
  };

  const handleAutoLogin = async (email: string, password: string, dspCode: string) => {
    try {
      const response = await axios.post(`${AppURL}/api/employee/login`, {
        email:email.toLocaleLowerCase(),
        password,
        dsp_code: dspCode.toLowerCase(),
      });
      const data = response.data;

      // Navigation vers la page d'accueil après succès
      navigation.navigate('_layoutHome', { user: data });
    } catch (error) {
      setServerError('Auto-login failed. Please sign in again.');
    }
  };

  const handleSubmit = async () => {
    if (!validateFields()) {
      return;
    }

    setIsLoading(true); // Début du chargement
    const employe = {
      password: inputstate.password,
      email: inputstate.email.toLowerCase(),
      dsp_code: inputstate.Dsp_Code.toLowerCase(),
    };

    try {
      const response = await axios.post(`${AppURL}/api/employee/login`, employe);
      const data = response.data;

      // Sauvegarde des informations dans AsyncStorage
      await AsyncStorage.setItem('email', inputstate.email);
      await AsyncStorage.setItem('password', inputstate.password);
      await AsyncStorage.setItem('Dsp_Code', inputstate.Dsp_Code);

      // Navigation vers la page d'accueil après succès
      navigation.navigate('_layoutHome', { user: data });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        setServerError(error.response.data.message || 'An error occurred. Please try again.');
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false); // Fin du chargement
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#ffffff" />
      ) : (
        <>
          <Text style={styles.title}>SIGN IN</Text>
          <Email inputstate={inputstate} setinputstate={setinputstate} />
          <PassWord inputstate={inputstate} setinputstate={setinputstate} />
          <Dsp_Code inputstate={inputstate} setinputstate={setinputstate} />
          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => navigation.navigate('Sign_Up')}
          >
            <Text style={styles.buttonText2}>Create an Account</Text>
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
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#ffffff',
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
    color: '#001933',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonText2: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupButton: {
    backgroundColor: '#6C757D',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  errorText: {
    color: '#ff4d4d',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default Sign_In;
