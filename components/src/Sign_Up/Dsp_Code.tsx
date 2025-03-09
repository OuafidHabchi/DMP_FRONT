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
    Dsp_Code: string;
    Language: string;
  };
  setinputstate: React.Dispatch<
    React.SetStateAction<{
      name: string;
      familyName: string;
      email: string;
      tel: string;
      password: string;
      confirmation: string;
      Dsp_Code: string;
      Language: string;
    }>
  >;
  showValidation: {
    name: boolean;
    familyName: boolean;
    email: boolean;
    tel: boolean;
    password: boolean;
    confirmation: boolean;
    Dsp_Code: boolean;
    Language: boolean;
  };
}

const Dsp_Code: React.FC<PseudoProps> = ({ inputstate, setinputstate, showValidation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Dsp Code:</Text>
      <TextInput
        style={styles.input}
        value={inputstate.Dsp_Code}
        onChangeText={(text) => setinputstate({ ...inputstate, Dsp_Code: text })}
      />
      {showValidation.Dsp_Code && (
        <Text style={styles.errorText}>Dsp Code must be exactly 5 characters.</Text> // Corrected
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
  errorText: {
    color: 'red',
    marginTop: 5,
    fontSize: 12,
  },
});

export default Dsp_Code;
