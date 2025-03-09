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

const PassWord: React.FC<PseudoProps> = ({ inputstate, setinputstate }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Password:</Text>
            <TextInput
                style={styles.input}
                value={inputstate.password}
                onChangeText={(text) => setinputstate({ ...inputstate, password: text })}
                secureTextEntry={true}
                placeholder="Enter your password"
                inputMode="text" // Ajout pour la compatibilité future
            />
            {/* Optionnel : Masquer l'affichage du mot de passe en clair */}
            {/* <Text style={styles.passwordText}>{inputstate.password}</Text> */}
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
    passwordText: {
        marginTop: 10,
        color: '#001933',
    },
});

export default PassWord;
