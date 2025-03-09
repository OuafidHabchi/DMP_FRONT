import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

interface PseudoProps {
  inputstate: {
    name: string;
    familyName: string;
    email: string;
    tel: string;
    password: string;
    confirmation: string;
    Language: string,
  };
  setinputstate: React.Dispatch<
    React.SetStateAction<{
      name: string;
      familyName: string;
      email: string;
      tel: string;
      password: string;
      confirmation: string;
      Language: string,
    }>
  >;
  showValidation: {
    name: boolean;
    familyName: boolean;
    email: boolean;
    tel: boolean;
    password: boolean;
    confirmation: boolean;
    Language: boolean,
  };
}

const FamilyName: React.FC<PseudoProps> = ({ inputstate, setinputstate, showValidation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Family Name:</Text>
      <TextInput
        style={styles.input}
        value={inputstate.familyName}
        onChangeText={(text) => setinputstate({ ...inputstate, familyName: text })}
        inputMode="text" // Ajout pour garantir la compatibilité future pour les champs de texte
      />
      {showValidation.familyName && (
        <Text>Family Name must be between 3 and 64 characters.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 20,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#001933',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#001933',
  },
  input: {
    height: 40,
    borderColor: '#001933',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
});

export default FamilyName;
