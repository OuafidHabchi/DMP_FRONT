import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

interface PseudoProps {
  inputstate: {
    email: string;
    password: string;
    Dsp_Code: string;
  };
  setinputstate: React.Dispatch<React.SetStateAction<{
    email: string;
    password: string;
    Dsp_Code: string;
  }>>;
}

const Dsp_Code: React.FC<PseudoProps> = ({ inputstate, setinputstate }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Dsp Code:</Text>
      <TextInput
        secureTextEntry={true}
        placeholder="Enter your Dsp Code"
        style={styles.input}
        value={inputstate.Dsp_Code}
        onChangeText={(text) => setinputstate({ ...inputstate, Dsp_Code: text })}
      />
      {/* <Text style={styles.errorText}>Dsp Code must be exactly 5 characters.</Text>  */}
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
    borderColor: '#ddd',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
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
