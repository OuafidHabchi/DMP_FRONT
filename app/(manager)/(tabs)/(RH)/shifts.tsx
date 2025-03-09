import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Modal, TextInput, TouchableOpacity, Pressable, Alert, Switch, FlatList, Platform } from 'react-native';
import axios from 'axios';
import AppURL from '@/components/src/URL';
import PickerModal from '@/components/src/PickerModal';
import { useUser } from '@/context/UserContext';

type Shift = {
  _id: string;
  name: string;
  starttime: string;
  endtime: string;
  color: string;
  visible: boolean;
};

const Shifts = () => {
  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
  const colors = [
    { label: user?.language === 'English' ? 'Red' : 'Rouge', value: '#FF6B6B' },  // Contrastée avec du texte blanc
    { label: user?.language === 'English' ? 'Green' : 'Vert', value: '#006400' },  // Dark green, bien contrasté
    { label: user?.language === 'English' ? 'Blue' : 'Bleu', value: '#0000FF' },  // Bleu marine, bien visible
    { label: user?.language === 'English' ? 'Yellow' : 'Jaune', value: '#FFD700' },  // Jaune doré, bien visible
    { label: user?.language === 'English' ? 'Pink' : 'Rose', value: '#FF1493' },  // Rose vif, contraste élevé
    { label: user?.language === 'English' ? 'Cyan' : 'Cyan', value: '#00FFFF' },  // Cyan vif, bien visible
    { label: user?.language === 'English' ? 'Purple' : 'Violet', value: '#800080' },  // Violet foncé, bien contrasté
    { label: user?.language === 'English' ? 'Orange' : 'Orange', value: '#FFA500' },  // Orange vif
    { label: user?.language === 'English' ? 'Gray' : 'Gris', value: '#2F4F4F' },  // Gris foncé
    { label: user?.language === 'English' ? 'Black' : 'Noir', value: '#000000' },  // Noir, contraste élevé avec du texte blanc
  ];

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newShiftModalVisible, setNewShiftModalVisible] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [newShift, setNewShift] = useState({
    name: '',
    starttime: '',
    endtime: '',
    color: colors[0].value,
    visible: true,
  });

  useEffect(() => {
    fetchShifts();
  }, []);



  const fetchShifts = async () => {
    try {
      const response = await axios.get(`${AppURL}/api/shifts/shifts`, {
        params: { dsp_code: user?.dsp_code },
      });
      setShifts(response.data);
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Error fetching shifts.'
            : 'Erreur lors de la récupération des shifts.'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Error fetching shifts.'
            : 'Erreur lors de la récupération des shifts.'
        );
      }
    }
  };

  const handleCreateShift = async () => {
    if (!newShift.name || !newShift.starttime || !newShift.endtime) {
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'All fields are required'
            : 'Tous les champs sont obligatoires'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'All fields are required'
            : 'Tous les champs sont obligatoires'
        );
      }
      return;
    }
    try {
      const response = await axios.post(`${AppURL}/api/shifts/shifts`, {
        ...newShift,
        dsp_code: user?.dsp_code, // Ajout de dsp_code
      });
      setShifts([...shifts, response.data]);
      setNewShiftModalVisible(false);
      setNewShift({ name: '', starttime: '', endtime: '', color: colors[0].value, visible: true });
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Shift added successfully'
            : 'Shift ajouté avec succès'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Success' : 'Succès',
          user?.language === 'English'
            ? 'Shift added successfully'
            : 'Shift ajouté avec succès'
        );
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Error creating shift.'
            : 'Erreur lors de la création du shift.'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Error creating shift.'
            : 'Erreur lors de la création du shift.'
        );
      }
    }
  };


  const handleUpdateShift = async () => {
    if (!selectedShift) return;
    try {
      const response = await axios.put(`${AppURL}/api/shifts/shifts/${selectedShift._id}`, {
        ...selectedShift,
        dsp_code: user?.dsp_code, // Ajout de dsp_code
      });
      setShifts(shifts.map(shift => (shift._id === response.data._id ? response.data : shift)));
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Shift updated successfully'
            : 'Shift mis à jour avec succès'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Success' : 'Succès',
          user?.language === 'English'
            ? 'Shift updated successfully'
            : 'Shift mis à jour avec succès'
        );
      }
      setModalVisible(false);

    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Error updating shift.'
            : 'Erreur lors de la mise à jour du shift.'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Error updating shift.'
            : 'Erreur lors de la mise à jour du shift.'
        );
      }
    }
  };


  // Function to delete a shift
  const handleDeleteShift = async (id: string) => {
    try {
      const confirmationMessage = user?.language === 'English'
        ? 'Are you sure you want to delete this shift?'
        : 'Êtes-vous sûr de vouloir supprimer ce shift ?';

      const successMessage = user?.language === 'English'
        ? 'Shift deleted successfully!'
        : 'Shift supprimé avec succès !';

      const errorMessage = user?.language === 'English'
        ? 'Error deleting shift.'
        : 'Erreur lors de la suppression du shift.';

      // Confirmation pour React Native
      if (Platform.OS !== 'web') {
        return Alert.alert(
          user?.language === 'English' ? 'Confirmation' : 'Confirmation',
          confirmationMessage,
          [
            {
              text: user?.language === 'English' ? 'Cancel' : 'Annuler',
              style: 'cancel',
            },
            {
              text: user?.language === 'English' ? 'Delete' : 'Supprimer',
              onPress: async () => {
                await deleteShift(id, successMessage, errorMessage);
              },
              style: 'destructive',
            },
          ]
        );
      }

      // Confirmation pour le Web
      if (window.confirm(confirmationMessage)) {
        await deleteShift(id, successMessage, errorMessage);
      }
    } catch (error) {
      console.error('Error handling delete shift:', error);
    }
  };

  // Fonction séparée pour exécuter la suppression après confirmation
  const deleteShift = async (id: string, successMessage: string, errorMessage: string) => {
    try {
      // Supprimer les disponibilités
      await axios.delete(`${AppURL}/api/disponibilites/disponibilites/shift/${id}`, {
        data: { dsp_code: user?.dsp_code },
      });

      // Supprimer le shift
      await axios.delete(`${AppURL}/api/shifts/shifts/${id}`, {
        data: { dsp_code: user?.dsp_code },
      });

      // Mettre à jour l'état
      setShifts(shifts.filter(shift => shift._id !== id));

      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert('Success', successMessage);
      }

      setModalVisible(false);
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };



  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {user?.language === 'English' ? 'Shift Management' : 'Gestion des Quarts'}
      </Text>

      {/* Shift List */}
      <FlatList
        data={shifts}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => {
            setSelectedShift(item);
            setModalVisible(true);
          }}>
            <View style={[styles.shiftItem, { backgroundColor: item.color }]}>
              <Text style={styles.shiftText}>
                {user?.language === 'English' ? `Name: ${item.name}` : `Nom: ${item.name}`}
              </Text>
              <Text style={styles.shiftText}>
                {user?.language === 'English' ? `Start: ${item.starttime}` : `Début: ${item.starttime}`}
              </Text>
              <Text style={styles.shiftText}>
                {user?.language === 'English' ? `End: ${item.endtime}` : `Fin: ${item.endtime}`}
              </Text>
              <Text style={styles.shiftText}>
                {user?.language === 'English' ? `Visible: ${item.visible ? 'Yes' : 'No'}` : `Visible: ${item.visible ? 'Oui' : 'Non'}`}
              </Text>
            </View>

          </TouchableOpacity>
        )}
      />

      {/* Add Shift Button */}
      <Pressable style={styles.floatingButton} onPress={() => setNewShiftModalVisible(true)}>
        <Text style={styles.floatingButtonText}>+</Text>
      </Pressable>

      {/* Modal for Adding a Shift */}
      <Modal visible={newShiftModalVisible} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {user?.language === 'English' ? 'Add Shift' : 'Ajouter un Quart'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={user?.language === 'English' ? 'Name' : 'Nom'}
              value={newShift.name}
              onChangeText={text => setNewShift({ ...newShift, name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder={user?.language === 'English' ? 'Start Time (Format: HH : MM)' : 'Heure de début (Format: HH : MM)'}
              value={newShift.starttime}
              onChangeText={text => setNewShift({ ...newShift, starttime: text })}
            />
            <TextInput
              style={styles.input}
              placeholder={user?.language === 'English' ? 'End Time (Format: HH : MM)' : 'Heure de fin (Format: HH : MM)'}
              value={newShift.endtime}
              onChangeText={text => setNewShift({ ...newShift, endtime: text })}
            />
            <PickerModal
              title="Select Color" // Titre ou placeholder
              options={colors.map(color => ({ label: color.label, value: color.value }))} // Transformation des données
              selectedValue={newShift.color} // Valeur actuelle sélectionnée
              onValueChange={(value) =>
                setNewShift({ ...newShift, color: value })
              }
            />

            <View style={styles.switchContainer}>
              <Text style={[
                styles.switchLabel,
                { color: newShift.visible ? 'green' : 'red' }
              ]}>
                {newShift.visible ? 'Visible' : 'Not Visible'}
              </Text>
              <Switch
                value={newShift.visible}
                onValueChange={value => setNewShift({ ...newShift, visible: value })}
              />
            </View>

            <Pressable style={styles.button} onPress={handleCreateShift}>
              <Text style={styles.buttonText}>
                {user?.language === 'English' ? 'Create' : 'Créer'}
              </Text>
            </Pressable>
            <Pressable style={styles.buttonClose} onPress={() => setNewShiftModalVisible(false)}>
              <Text style={styles.buttonText}>
                {user?.language === 'English' ? 'Close' : 'Fermer'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal for Updating a Shift */}
      {selectedShift && (
        <Modal visible={modalVisible} animationType="fade" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {user?.language === 'English' ? 'Edit Shift' : 'Modifier le Quart'}
              </Text>
              <TextInput
                style={styles.input}
                value={selectedShift.name}
                onChangeText={text => setSelectedShift({ ...selectedShift, name: text })}
                placeholder={user?.language === 'English' ? 'Name' : 'Nom'}
              />
              <TextInput
                style={styles.input}
                value={selectedShift.starttime}
                onChangeText={text => setSelectedShift({ ...selectedShift, starttime: text })}
                placeholder={user?.language === 'English' ? 'Start Time' : 'Heure de début'}
              />
              <TextInput
                style={styles.input}
                value={selectedShift.endtime}
                onChangeText={text => setSelectedShift({ ...selectedShift, endtime: text })}
                placeholder={user?.language === 'English' ? 'End Time' : 'Heure de fin'}
              />
              <PickerModal
                title="Select Color" // Titre ou placeholder pour le bouton / modal
                options={colors.map(color => ({ label: color.label, value: color.value }))} // Transformation des données
                selectedValue={selectedShift.color} // Valeur actuellement sélectionnée
                onValueChange={(value) =>
                  setSelectedShift({ ...selectedShift, color: value })
                }
              />

              <View style={styles.switchContainer}>
                <Text style={[
                  styles.switchLabel,
                  { color: selectedShift?.visible ? 'green' : 'red' } // Utiliser selectedShift.visible
                ]}>
                  {selectedShift?.visible ? 'Visible' : 'Not Visible'}
                </Text>
                <Switch
                  value={selectedShift?.visible || false} // Assurez-vous que selectedShift.visible est utilisé
                  onValueChange={(value) => setSelectedShift({ ...selectedShift!, visible: value })}
                />
              </View>
              <Pressable style={styles.button} onPress={handleUpdateShift}>
                <Text style={styles.buttonText}>
                  {user?.language === 'English' ? 'Update' : 'Mettre à jour'}
                </Text>
              </Pressable>
              <Pressable style={styles.buttonDelete} onPress={() => handleDeleteShift(selectedShift._id)}>
                <Text style={styles.buttonText}>
                  {user?.language === 'English' ? 'Delete' : 'Supprimer'}
                </Text>
              </Pressable>
              <Pressable style={styles.buttonClose} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>
                  {user?.language === 'English' ? 'Close' : 'Fermer'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default Shifts;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#001933', marginBottom: 20 },
  shiftItem: { padding: 20, borderRadius: 10, marginBottom: 10 },
  shiftText: { color: 'white', fontWeight: '600' },
  pickerContainer: { borderRadius: 8, borderWidth: 1, borderColor: '#001933', backgroundColor: '#f0f0f0', marginBottom: 12, padding: 10 },
  picker: { height: 50 },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  button: { backgroundColor: '#001933', padding: 10, borderRadius: 8, marginBottom: 10 },
  buttonText: { color: 'white', textAlign: 'center' },
  floatingButton: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#001933', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  floatingButtonText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { padding: 20, backgroundColor: 'white', marginHorizontal: 20, borderRadius: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#001933', borderRadius: 8, paddingHorizontal: 10, marginBottom: 10, height: 40 },
  buttonDelete: {
    backgroundColor: '#E74C3C', // Rouge vif pour suppression
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 10, // Espacement entre le texte et le Switch
  },
  buttonClose: { backgroundColor: '#7f8c8d', padding: 10, borderRadius: 8, marginBottom: 10 }

});
