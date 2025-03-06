import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PickerModal from '../PickerModal';


interface PseudoProps {
  inputstate: {
    name: string;
    familyName: string;
    email: string;
    tel: string;
    password: string;
    confirmation: string;
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
    Language: boolean;
  };
}

const Language: React.FC<PseudoProps> = ({ inputstate, setinputstate, showValidation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Language:</Text>
      <PickerModal
        title={'Select a Language'}
        options={[
          { label: 'English', value: 'English' },
          { label: 'Français', value: 'Français' },
        ]}
        selectedValue={inputstate.Language}
        onValueChange={(value) => setinputstate({ ...inputstate, Language: value })}
      />
      {showValidation.Language && (
        <Text style={styles.errorText}>Please select a language.</Text>
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
    borderColor: '#ddd',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  picker: {
    height: 50,
    color: '#333',
    backgroundColor: '#fff',
    borderRadius: 5,
  },
  errorText: {
    marginTop: 5,
    color: 'red',
    fontSize: 12,
  },
});

export default Language;
