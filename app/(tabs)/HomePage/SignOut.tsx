import React from 'react';
import { Button, View, StyleSheet } from 'react-native';
import { StackActions } from '@react-navigation/native';

const SignOut: React.FC<{ navigation: any }> = ({ navigation }) => {
    const handleSignOut = () => {
        navigation.dispatch(StackActions.replace('Acceuil'));
    };

    return (
        <View style={styles.container}>
            {navigation.dispatch(StackActions.replace('Sign_in'))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default SignOut;
