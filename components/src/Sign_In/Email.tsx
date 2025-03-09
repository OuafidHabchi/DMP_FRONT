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

const Email: React.FC<PseudoProps> = ({ inputstate, setinputstate }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Email:</Text>
            <TextInput
                style={styles.input}
                value={inputstate.email}
                onChangeText={(text) => setinputstate({ ...inputstate, email: text })}
                placeholder="Enter your email"
                inputMode="email" // Remplacement de keyboardType pour la compatibilité future
            />
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

export default Email;
