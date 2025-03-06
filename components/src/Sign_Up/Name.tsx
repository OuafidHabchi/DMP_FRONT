import React from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'



interface PseudoProps{
    inputstate: {
        name:string
        familyName:string
        email :string
        tel:string
        password: string;
        confirmation:string
        Language: string,
        
      };
      setinputstate: React.Dispatch<React.SetStateAction<{
        name:string
        familyName:string
        email :string
        tel:string
        password: string;
        confirmation:string
        Language: string,
        
      }>>;
      showValidation: {
        name:boolean
        familyName:boolean
        email :boolean
        tel:boolean
        password: boolean;
        
      };
}
const Name :React.FC<PseudoProps> = ({inputstate,setinputstate,showValidation}) => {
  return (
    <View style={styles.container}>
    <Text style={styles.label}>Name:</Text>
    <TextInput
       style={styles.input}
        value={inputstate.name}
        onChangeText={(text) => setinputstate({ ...inputstate, name: text })}
    />
    {showValidation.name && <Text >Name must be between 3 and 64 characters.</Text>}
</View>
  )
}
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
export default Name

