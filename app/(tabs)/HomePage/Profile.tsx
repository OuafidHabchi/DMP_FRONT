import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import AppURL from '@/components/src/URL';

// Define the type User
type User = {
  _id: string; // Ensure this field is always available
  name: string;
  familyName: string;
  tel: string;
  email: string;
  password: string;
  role: string;
  scoreCard: string;
  focusArea: string;
  language: string,
  dsp_code: string,
};

export default function Profile() {
  const route = useRoute();
  const { user } = route.params as { user: User };

  const [modalVisible, setModalVisible] = useState(false);
  const [updatedUser, setUpdatedUser] = useState(user);
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility

  // Function to handle the update and send the PUT request
  const handleSave = async () => {
    // Ensure user ID is valid before making the request
    if (!updatedUser._id) {
      Alert.alert('Error', "User ID is missing.");
      return;
    }

    const updatedUserData = {
      name: updatedUser.name,
      familyName: updatedUser.familyName,
      tel: updatedUser.tel,
      email: updatedUser.email,
      password: updatedUser.password, // Include the password in the update
    };

    try {
      const response = await axios.put(`${AppURL}/api/employee/profile/${updatedUser._id}?dsp_code=${user.dsp_code}`, updatedUserData);
      const data = response.data;

      Alert.alert('Success', 'Information updated successfully.');
      setModalVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{user.name} {user.familyName}</Text>
        <Text style={styles.scoreCardText}>Score Card = {user.scoreCard}</Text>
        {(user.focusArea !== "N/A") && (
          <Text style={styles.scoreCardText}> focus Area = {user.focusArea}</Text>
        )}

      </View>
      <ScrollView>

        {/* Display User Information */}
        <View style={styles.infoContainer}>
          <View style={styles.card}>
            <Text style={styles.label}>
              {user.language === 'English' ? 'Name' : 'Nom'}
            </Text>
            <Text style={styles.value}>{updatedUser.name}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>
              {user.language === 'English' ? 'First Name' : 'Prénom'}
            </Text>
            <Text style={styles.value}>{updatedUser.familyName}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>
              {user.language === 'English' ? 'Phone' : 'Téléphone'}
            </Text>
            <Text style={styles.value}>{updatedUser.tel}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{updatedUser.email}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
          <Text style={styles.buttonText}>
            {user.language === 'English' ? 'Update' : 'Mettre à Jour'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal to Edit User Information */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(!modalVisible)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>
              {user.language === 'English' ? 'Edit your information' : 'Modifier vos informations'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={updatedUser.name}
              onChangeText={(text) => setUpdatedUser({ ...updatedUser, name: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={updatedUser.familyName}
              onChangeText={(text) => setUpdatedUser({ ...updatedUser, familyName: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Phone"
              value={updatedUser.tel}
              onChangeText={(text) => setUpdatedUser({ ...updatedUser, tel: text })}
              keyboardType="phone-pad"
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={updatedUser.email}
              onChangeText={(text) => setUpdatedUser({ ...updatedUser, email: text })}
              keyboardType="email-address"
            />

            {/* Password Field with Toggle */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={updatedUser.password}
                onChangeText={(text) => setUpdatedUser({ ...updatedUser, password: text })}
                secureTextEntry={!showPassword} // Toggle password visibility

              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.showPasswordButton}
              >
                <Text style={styles.showPasswordText}>
                  {user.language === 'English' ? (showPassword ? 'Hide' : 'Show') : (showPassword ? 'Cacher' : 'Montrer')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {user.language === 'English' ? 'Save' : 'Enregistrer'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>
                  {user.language === 'English' ? 'Cancel' : 'Annuler'}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001933',
    padding: 20,

  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 5,
    marginTop: 20

  },
  headerText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scoreCardText: {
    color: '#ffffff',
    fontSize: 20,
    textAlign: 'center',
  },
  infoContainer: {
    marginVertical: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    color: '#001933',
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  button: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#001933',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  showPasswordButton: {
    marginLeft: -53
  },
  showPasswordText: {
    color: '#001933',
    fontWeight: 'bold',

  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    backgroundColor: '#001933',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#001933',
    fontSize: 16,
    fontWeight: 'bold',
  },
});



