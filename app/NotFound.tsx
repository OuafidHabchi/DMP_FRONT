import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Text, View } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/app/(tabs)/_layout'; // Assure-toi d'importer correctement les types

// Typage pour la navigation
type NotFoundScreenNavigationProp = StackNavigationProp<RootStackParamList, 'NotFound'>;

const NotFound: React.FC = () => {
  const navigation = useNavigation<NotFoundScreenNavigationProp>();

  useEffect(() => {
    // Redirige automatiquement vers Sign_In
    navigation.navigate('Sign_In');
  }, [navigation]);

  return (
    <View>
      <Text>Redirecting to Sign In...</Text>
    </View>
  );
};

export default NotFound;
