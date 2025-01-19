import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AppURL from '@/components/src/URL'; // Assurez-vous que cette URL est correcte pour ton API

interface CameraCaptureButtonProps {
  employeeName: string;
  employeeFamilyName: string;
  vanName: string;
  dspCode: string;
  userId: string; // Ajout du userId
  photoType: 'prepic' | 'postpic'; // Ajout du type de photo (prepic ou postpic)
  onSuccess: () => void; // Ajout de la fonction de succès pour fermer le modal
}

const CameraCaptureButton: React.FC<CameraCaptureButtonProps> = ({
  employeeName,
  employeeFamilyName,
  vanName,
  dspCode,
  userId, // Passer le userId en prop
  photoType, // Passer le photoType en prop (prepic ou postpic)
  onSuccess, // Ajoutez onSuccess
}) => {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Fonction pour ouvrir directement la caméra et prendre une photo
  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1, // Utiliser la qualité maximale pour un traitement ultérieur
    });

    if (!result.canceled) {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400 } }], // Redimensionner l'image à une largeur de 800px
        { compress: 0.2, format: ImageManipulator.SaveFormat.JPEG } // Compression à 50% de la qualité
      );
      setCapturedPhoto(manipulatedImage.uri);
    }
  };

  // Fonction pour envoyer la photo capturée et les données associées
  const sendCapturedImage = async (uri: string) => {
    if (!uri) {
      Alert.alert('No photo', 'Please take a photo first.');
      return;
    }

    const formData = new FormData();
    const uriParts = uri.split('.');
    const fileType = uriParts[uriParts.length - 1]; // Get the file type (extension)

    // Créer un objet File à partir de l'URI de l'image
    const file = {
      uri: uri,
      name: `photo-${Date.now()}.${fileType}`,
      type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`, // Utilisation du type approprié
    } as any;

    // Ajouter de l'image à formData
    formData.append('image', file);
    // Ajouter les informations supplémentaires
    formData.append('employeeName', `${employeeName} ${employeeFamilyName}`);
    formData.append('vanName', vanName);
    formData.append('dsp_code', dspCode);
    formData.append('userId', userId); // Ajout du userId
    formData.append('photoType', photoType); // Ajouter le type de photo (prepic ou postpic)

  const currentDay = new Date().toDateString(); // Ajout de la date actuelle au format souhaité

    const currentTime = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    formData.append('localTime', currentTime); // Ajout de l'heure actuelle au format HH:mm
    formData.append('day', currentDay); // Ajout de la date au format "Sat Dec 28 2024"

    try {
      const response = await fetch(`${AppURL}/api/equipment-update/equipment-updates?dsp_code=${dspCode}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data', // Assurez-vous que c'est bien set
        },
      });

      if (response.ok) {
        Alert.alert('Success', 'Image uploaded successfully');
        setCapturedPhoto(null); // Clear the captured photo
        onSuccess(); // Appeler onSuccess pour fermer le modal
      } else {
        const errorMessage = await response.text();
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload the image');
    }
  };

  // Utiliser useEffect pour ouvrir la caméra immédiatement au montage
  useEffect(() => {
    openCamera();
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={openCamera} style={styles.button}>
        <Text style={styles.buttonText}>Take Photo</Text>
      </TouchableOpacity>

      {capturedPhoto && (
        <View style={styles.photoPreviewContainer}>
          <Image source={{ uri: capturedPhoto }} style={styles.photoPreview} />
        </View>
      )}

      {capturedPhoto && (
        <TouchableOpacity onPress={() => sendCapturedImage(capturedPhoto)} style={styles.submitButton}>
          <Text style={styles.buttonText}>Submit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  button: {
    backgroundColor: '#dc3545',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#001933',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  photoPreviewContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  photoPreview: {
    width: 200,
    height: 200,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DDD',
  },
});

export default CameraCaptureButton;
