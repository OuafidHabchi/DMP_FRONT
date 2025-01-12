import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import Email from '@/components/src/Sign_In/Email';
import PassWord from '@/components/src/Sign_In/PassWord';
import Dsp_Code from '@/components/src/Sign_In/Dsp_Code';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from './_layout'; // Assurez-vous d'importer le type RootStackParamList depuis votre fichier _layout.tsx
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

const URL = 'https://coral-app-wqv9l.ondigitalocean.app';

type Sign_InScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Sign_In'>;

const Sign_In: React.FC = () => {
  const navigation = useNavigation<Sign_InScreenNavigationProp>();

  const [serverError, setServerError] = useState('');
  const [inputstate, setinputstate] = useState({
    email: '',
    password: '',
    Dsp_Code: '',
  });

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

  const handleSubmit = async () => {
    // Validation locale
    if (!validateFields()) {
      return;
    }

    const employe = {
      password: inputstate.password,
      email: inputstate.email,
      dsp_code: inputstate.Dsp_Code.toLowerCase(), // Convert dsp_code to lowercase
    };
    console.log(employe);

    try {
      // Envoi des données au backend
      const response = await axios.post(`${URL}/api/employee/login`, employe);
      const data = response.data;

      // Navigation vers la page d'accueil après succès
      navigation.navigate('_layoutHome', { user: data });
    } catch (error) {
      // Gestion des erreurs backend
      if (axios.isAxiosError(error) && error.response) {
        setServerError(error.response.data.message || 'An error occurred. Please try again.');
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SIGN IN</Text>
      <Email inputstate={inputstate} setinputstate={setinputstate} />
      <PassWord inputstate={inputstate} setinputstate={setinputstate} />
      <Dsp_Code inputstate={inputstate} setinputstate={setinputstate} />
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.signupButton} onPress={() => navigation.navigate('Sign_Up')}>
        <Text style={styles.buttonText2}>Create an Account</Text>
      </TouchableOpacity>
      {serverError ? <Text style={styles.errorText}>{serverError}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#ffffff', // Titre en blanc
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#001933', // Couleur de fond bleu vif
  },
  button: {
    backgroundColor: '#ffffff', // Bouton "Sign In" avec fond blanc
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: '#001933', // Texte des boutons en bleu vif pour contraste
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonText2: {
    color: '#ffffff', // Texte des boutons en bleu vif pour contraste
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupButton: {
    backgroundColor: '#6C757D', // Bouton "Create an Account" avec fond gris (#6C757D)
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  errorText: {
    color: '#ff4d4d', // Rouge vif pour les messages d'erreur
    marginTop: 10,
    textAlign: 'center',
  },
});

export default Sign_In;
