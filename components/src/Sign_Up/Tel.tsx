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
}

const Tel: React.FC<PseudoProps> = ({ inputstate, setinputstate }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tel:</Text>
      <TextInput
        style={styles.input}
        value={inputstate.tel}
        onChangeText={(text) => setinputstate({ ...inputstate, tel: text })}
        inputMode="tel" // Correct replacement for keyboardType="phone-pad"
      />
      {/* {showValidation.tel && <Text style={styles.errorText}>Tel must be between and 64 characters.</Text>} */}
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
});

export default Tel;
