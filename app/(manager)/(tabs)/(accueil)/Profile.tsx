import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import axios from 'axios';
import AppURL from '@/components/src/URL';
import { useUser } from '@/context/UserContext';


// Définition du type User
type User = {
  _id: string;
  name: string;
  familyName: string;
  tel: string;
  email: string;
  password: string;
  role: string;
  scoreCard: string;
  focusArea: string;
  language: string;
  dsp_code: string;
};

export default function Profile() {

  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
  const [updatedUser, setUpdatedUser] = useState<User>({
    _id: user?._id ?? '',
    name: user?.name ?? '',
    familyName: user?.familyName ?? '',
    tel: user?.tel ?? '',
    email: user?.email ?? '',
    password: user?.password ?? '',
    role: user?.role ?? '',
    scoreCard: user?.scoreCard ?? '',
    focusArea: user?.focusArea ?? '', // ✅ Ensure it never becomes undefined
    language: user?.language ?? '',
    dsp_code: user?.dsp_code ?? '',
  });



  const [modalVisible, setModalVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = async () => {
    if (!updatedUser?._id) {
      Alert.alert('Erreur', "L'identifiant utilisateur est manquant.");
      return;
    }

    const updatedUserData = {
      name: updatedUser.name,
      familyName: updatedUser.familyName,
      tel: updatedUser.tel,
      email: updatedUser.email,
      password: updatedUser.password,
    };

    try {
      await axios.put(`${AppURL}/api/employee/profile/${updatedUser._id}?dsp_code=${updatedUser.dsp_code}`, updatedUserData);
      Alert.alert('Succès', 'Informations mises à jour avec succès.');
      window.alert('Informations mises à jour avec succès.');
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
      window.alert('Une erreur est survenue. Veuillez réessayer.');
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: Unable to retrieve the user.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Score Card = {user.scoreCard}</Text>
        {user.focusArea !== "N/A" && (
          <Text style={styles.scoreCardText}>Focus Area = {user.focusArea}</Text>
        )}
      </View>

      <ScrollView>
        <View style={styles.infoContainer}>
          {['name', 'familyName', 'tel', 'email'].map((field) => (
            <View style={styles.card} key={field}>
              <Text style={styles.label}>{user.language === 'English' ? field : field}</Text>
              <Text style={styles.value}>{(updatedUser as any)[field]}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
          <Text style={styles.buttonText}>
            {user.language === 'English' ? 'Update' : 'Mettre à Jour'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>
              {user.language === 'English' ? 'Edit your information' : 'Modifier vos informations'}
            </Text>

            {['name', 'familyName', 'tel', 'email'].map((field) => (
              <TextInput
                key={field}
                style={styles.input}
                placeholder={field}
                value={(updatedUser as any)[field]}
                onChangeText={(text) => setUpdatedUser((prev: any) => ({ ...prev, [field]: text }))}
                keyboardType={field === 'tel' ? 'phone-pad' : 'default'}
              />
            ))}

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={updatedUser.password}
                onChangeText={(text) => setUpdatedUser((prev: any) => ({ ...prev, password: text }))}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.showPasswordButton}>
                <Text style={styles.showPasswordText}>{showPassword ? 'Cacher' : 'Montrer'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001933', padding: 20 },
  errorText: { color: 'red', fontSize: 18, textAlign: 'center', marginTop: 20 },
  header: { paddingVertical: 20, borderRadius: 10, marginBottom: 5, marginTop: 20 },
  headerText: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  scoreCardText: { color: '#fff', fontSize: 20, textAlign: 'center' },
  infoContainer: { marginVertical: 20 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 10 },
  label: { fontSize: 16, color: '#001933' },
  value: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 5 },
  button: { backgroundColor: '#fff', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#001933', fontSize: 16, fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalView: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  showPasswordButton: { marginLeft: 10 },
  showPasswordText: { color: '#001933', fontWeight: 'bold' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  saveButton: { backgroundColor: '#001933', padding: 10, borderRadius: 5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#fff', padding: 10, borderRadius: 5 },
  cancelButtonText: { color: '#001933', fontSize: 16, fontWeight: 'bold' },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#001933',
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    paddingHorizontal: 10,
    fontSize: 16,
    width: '100%',
  },
});

