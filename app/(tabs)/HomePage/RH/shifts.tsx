import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Modal, TextInput, TouchableOpacity, Pressable, Alert, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { useRoute } from '@react-navigation/native';
import AppURL from '@/components/src/URL';
import PickerModal from '@/components/src/PickerModal';

const colors = [
  { label: 'Red', value: '#FF6B6B' },
  { label: 'Green', value: '#6BCB77' },
  { label: 'Blue', value: '#4D96FF' },
  { label: 'Yellow', value: '#FFD93D' },
  { label: 'Pink', value: '#FF99C8' },
  { label: 'Cyan', value: '#62B6CB' },
  { label: 'Purple', value: '#9D4EDD' },
  { label: 'Orange', value: '#FF914D' },
  { label: 'Gray', value: '#A9A9A9' },
  { label: 'Black', value: '#333333' },
];

type Shift = {
  _id: string;
  name: string;
  starttime: string;
  endtime: string;
  color: string;
  visible: boolean;
};
type User = {
  _id: string;
  name: string;
  familyName: string;
  tel: string;
  email: string;
  password: string;
  role: string;
  language: string,
  dsp_code: string,
  conversation: string;
  expoPushToken?: string;
};

const Shifts = () => {
  const route = useRoute();
  const { user } = route.params as { user: User };
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
        params: { dsp_code: user.dsp_code },
      });
      setShifts(response.data);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    }
  };

  const handleCreateShift = async () => {
    if (!newShift.name || !newShift.starttime || !newShift.endtime) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    try {
      const response = await axios.post(`${AppURL}/api/shifts/shifts`, {
        ...newShift,
        dsp_code: user.dsp_code, // Ajout de dsp_code
      });
      setShifts([...shifts, response.data]);
      setNewShiftModalVisible(false);
      setNewShift({ name: '', starttime: '', endtime: '', color: colors[0].value, visible: true });
      Alert.alert('Success', 'Shift added successfully');
    } catch (error) {
      console.error('Error creating shift:', error);
    }
  };


  const handleUpdateShift = async () => {
    if (!selectedShift) return;
    try {
      const response = await axios.put(`${AppURL}/api/shifts/shifts/${selectedShift._id}`, {
        ...selectedShift,
        dsp_code: user.dsp_code, // Ajout de dsp_code
      });
      setShifts(shifts.map(shift => (shift._id === response.data._id ? response.data : shift)));
      setModalVisible(false);
      Alert.alert('Success', 'Shift updated successfully');
    } catch (error) {
      console.error('Error updating shift:', error);
    }
  };


  // Function to delete a shift
  const handleDeleteShift = async (id: string) => {
    try {
      // Supprimer les disponibilités avec dsp_code
      try {
        await axios.delete(`${AppURL}/api/disponibilites/disponibilites/shift/${id}`, {
          data: { dsp_code: user.dsp_code }, // Ajout de dsp_code
        });
      } catch (error) {
        console.warn('No disponibilités found for this shift:', error);
      }

      // Supprimer le shift avec dsp_code
      await axios.delete(`${AppURL}/api/shifts/shifts/${id}`, {
        data: { dsp_code: user.dsp_code }, // Ajout de dsp_code
      });

      // Mettre à jour l'état
      setShifts(shifts.filter(shift => shift._id !== id));
      Alert.alert('Success', 'Shift deleted successfully!');
      setModalVisible(false);
    } catch (error) {
      console.error('Error deleting shift:', error);
    }
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {user.language === 'English' ? 'Shift Management' : 'Gestion des Quarts'}
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
                {user.language === 'English' ? `Name: ${item.name}` : `Nom: ${item.name}`}
              </Text>
              <Text style={styles.shiftText}>
                {user.language === 'English' ? `Start: ${item.starttime}` : `Début: ${item.starttime}`}
              </Text>
              <Text style={styles.shiftText}>
                {user.language === 'English' ? `End: ${item.endtime}` : `Fin: ${item.endtime}`}
              </Text>
              <Text style={styles.shiftText}>
                {user.language === 'English' ? `Visible: ${item.visible ? 'Yes' : 'No'}` : `Visible: ${item.visible ? 'Oui' : 'Non'}`}
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
              {user.language === 'English' ? 'Add Shift' : 'Ajouter un Quart'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={user.language === 'English' ? 'Name' : 'Nom'}
              value={newShift.name}
              onChangeText={text => setNewShift({ ...newShift, name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder={user.language === 'English' ? 'Start Time' : 'Heure de début'}
              value={newShift.starttime}
              onChangeText={text => setNewShift({ ...newShift, starttime: text })}
            />
            <TextInput
              style={styles.input}
              placeholder={user.language === 'English' ? 'End Time' : 'Heure de fin'}
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
                {user.language === 'English' ? 'Create' : 'Créer'}
              </Text>
            </Pressable>
            <Pressable style={styles.buttonClose} onPress={() => setNewShiftModalVisible(false)}>
              <Text style={styles.buttonText}>
                {user.language === 'English' ? 'Close' : 'Fermer'}
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
                {user.language === 'English' ? 'Edit Shift' : 'Modifier le Quart'}
              </Text>
              <TextInput
                style={styles.input}
                value={selectedShift.name}
                onChangeText={text => setSelectedShift({ ...selectedShift, name: text })}
                placeholder={user.language === 'English' ? 'Name' : 'Nom'}
              />
              <TextInput
                style={styles.input}
                value={selectedShift.starttime}
                onChangeText={text => setSelectedShift({ ...selectedShift, starttime: text })}
                placeholder={user.language === 'English' ? 'Start Time' : 'Heure de début'}
              />
              <TextInput
                style={styles.input}
                value={selectedShift.endtime}
                onChangeText={text => setSelectedShift({ ...selectedShift, endtime: text })}
                placeholder={user.language === 'English' ? 'End Time' : 'Heure de fin'}
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
                  {user.language === 'English' ? 'Update' : 'Mettre à jour'}
                </Text>
              </Pressable>
              <Pressable style={styles.buttonDelete} onPress={() => handleDeleteShift(selectedShift._id)}>
                <Text style={styles.buttonText}>
                  {user.language === 'English' ? 'Delete' : 'Supprimer'}
                </Text>
              </Pressable>
              <Pressable style={styles.buttonClose} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>
                  {user.language === 'English' ? 'Close' : 'Fermer'}
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
