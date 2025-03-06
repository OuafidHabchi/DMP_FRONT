import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const AccessDenied = () => {

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🚫</Text>
      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.message}>
        Your access to this application has been denied.{"\n"}
        Please contact the DMP team (DSP Management Partner) at the following address:{"\n"}
        <Text style={styles.email}>dspmanagementpartenaire@gmail.com</Text>
      </Text>

      <Text style={styles.title}>Accès Refusé</Text>
      <Text style={styles.message}>
        Votre accès à cette application a été refusé.{"\n"}
        Veuillez communiquer avec l'équipe de DMP (DSP Management Partenaire) à l'adresse suivante :{"\n"}
        <Text style={styles.email}>dspmanagementpartenaire@gmail.com</Text>
      </Text>

      
    </View>
  );
}

export default AccessDenied;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20
  },
  icon: {
    fontSize: 80,
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 10
  },
  message: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20
  },
  email: {
    fontWeight: 'bold',
    color: '#001933',
  },
  button: {
    backgroundColor: '#001933',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  }
});
