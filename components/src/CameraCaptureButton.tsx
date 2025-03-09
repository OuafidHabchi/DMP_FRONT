import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppURL from '@/components/src/URL';
import { useUser } from '@/context/UserContext';


interface CameraCaptureButtonProps {
  employeeName?: string;
  employeeFamilyName?: string;
  vanName?: string;
  dspCode?: string;
  userId?: string;
  photoType: 'prepic' | 'postpic';
  onSuccess: () => void;
}

const CameraCaptureButton: React.FC<CameraCaptureButtonProps> = ({
  employeeName,
  employeeFamilyName,
  vanName,
  dspCode,
  userId,
  photoType,
  onSuccess,
}) => {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte


  // ✅ Fonction pour ouvrir la caméra
  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        user?.language === 'English' ? 'Permission Denied' : 'Permission refusée',
        user?.language === 'English'
          ? 'Camera access is required to take a photo.'
          : 'L\'accès à la caméra est requis pour prendre une photo.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets?.length > 0) {
      // ✅ Compression de l’image
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
      );
      setCapturedPhoto(manipulatedImage.uri);
    }
  };

  // ✅ Fonction pour envoyer l'image au serveur
  const sendCapturedImage = async (uri: string) => {
    setIsUploading(true);

    const formData = new FormData();
    const uriParts = uri.split('.');
    const fileType = uriParts[uriParts.length - 1];

    formData.append('image', {
      uri: uri,
      name: `photo-${Date.now()}.${fileType}`,
      type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
    } as any);

    formData.append('employeeName', `${employeeName ?? ''} ${employeeFamilyName ?? ''}`);
    formData.append('vanName', vanName ?? '');
    formData.append('dsp_code', dspCode ?? '');
    formData.append('userId', userId ?? '');
    formData.append('photoType', photoType);

    const currentDay = new Date().toDateString();
    const currentTime = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    formData.append('localTime', currentTime);
    formData.append('day', currentDay);

    try {
      const response = await fetch(
        `${AppURL}/api/equipment-update/equipment-updates?dsp_code=${dspCode}`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.ok) {
        Alert.alert(
          user?.language === 'English' ? 'Success' : 'Succès',
          user?.language === 'English' ? 'Photo sent successfully!' : 'Photo envoyée avec succès !'
        );

        // ✅ Mettre à jour AsyncStorage selon le type de photo
        if (photoType === 'prepic') {
          await AsyncStorage.setItem('prepic', 'false');
          await AsyncStorage.setItem('postpic', 'true');
        } else if (photoType === 'postpic') {
          await AsyncStorage.setItem('postpic', 'false');
          await AsyncStorage.setItem('prepic', 'false');
        }

        // ✅ Appeler immédiatement la fonction de succès
        onSuccess();

        // ✅ Effacer la photo de l’état
        setCapturedPhoto(null);
      } else {
        const errorText = await response.text();
        Alert.alert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? `Failed to send photo: ${errorText}`
            : `Échec de l'envoi de la photo : ${errorText}`
        );
      }
    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'Network error, please try again.'
          : 'Erreur réseau, veuillez réessayer.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    openCamera(); // ✅ Ouvrir automatiquement la caméra dès que le composant se monte
  }, []);

  return (
    <View style={styles.container}>
      {isUploading ? (
        <ActivityIndicator size="large" color="#001933" />
      ) : (
        <>
          {capturedPhoto && (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: capturedPhoto }} style={styles.photoPreview} />
            </View>
          )}

          <TouchableOpacity onPress={openCamera} style={styles.button}>
            <Text style={styles.buttonText}>
              {user?.language === 'English' ? 'Retake Photo' : 'Reprendre la photo'}
            </Text>
          </TouchableOpacity>

          {capturedPhoto && (
            <TouchableOpacity
              onPress={() => sendCapturedImage(capturedPhoto)}
              style={styles.submitButton}
              disabled={isUploading}
            >
              <Text style={styles.buttonText}>
                {isUploading ? 'Uploading...' : 'Submit Photo'}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  button: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginVertical: 10,
  },
  submitButton: {
    backgroundColor: '#001933',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginVertical: 10,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  photoPreviewContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  photoPreview: {
    width: 250,
    height: 250,
    borderRadius: 10,
    borderColor: '#DDD',
    borderWidth: 2,
  },
});

export default CameraCaptureButton;
