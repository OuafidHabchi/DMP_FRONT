import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Modal, TextInput, Pressable, Alert, RefreshControl, Platform, ScrollView, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useRoute } from '@react-navigation/native';
import AppURL from '@/components/src/URL';
import PickerModal from '@/components/src/PickerModal';

// Base URL without protocol or port
const URL = AppURL;
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

type Employee = {
  _id: string;
  name: string;
  familyName: string;
  tel: string;
  email: string;
  password: string;
  role: string;
  scoreCard: string;
  Transporter_ID: string;
};

const AllEmployees = () => {
  const route = useRoute();
  const { user } = route.params as { user: User };

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newEmployeeModalVisible, setNewEmployeeModalVisible] = useState(false);
  const [updatedEmployee, setUpdatedEmployee] = useState<Employee | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    familyName: '',
    tel: '',
    email: '',
    password: '',
    role: 'driver',
    scoreCard: 'New DA',
    Transporter_ID: '',
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch employees
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true); // Début du chargement
    try {
      const response = await axios.get(`${URL}/api/employee`, {
        params: { dsp_code: user.dsp_code },
      });
      setEmployees(response.data);
      setFilteredEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false); // Fin du chargement
    }
  };



  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployees().then(() => setRefreshing(false));
  };

  const handleOpenModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setUpdatedEmployee(employee); // Initialize `updatedEmployee` with the selected employee
    setModalVisible(true);
  };

  const handleUpdateEmployee = async () => {
    if (updatedEmployee) {
      try {
        const response = await axios.put(
          `${URL}/api/employee/profile/${updatedEmployee._id}`,
          { ...updatedEmployee, dsp_code: user.dsp_code }
        );
        const updatedList = employees.map(emp =>
          emp._id === response.data._id ? response.data : emp
        );
        setEmployees(updatedList);
        setFilteredEmployees(updatedList);
        setModalVisible(false);
        Alert.alert('Success', 'Employee information updated');
      } catch (error) {
        console.error('Error updating employee:', error);
      }
    }
  };


  const handleDeleteEmployee = async (id: string) => {
    try {
      await axios.delete(`${URL}/api/employee/profile/${id}`, {
        data: { dsp_code: user.dsp_code },
      });
      const updatedList = employees.filter(emp => emp._id !== id);
      setEmployees(updatedList);
      setFilteredEmployees(updatedList);
      setModalVisible(false);
      Alert.alert('Success', 'Employee deleted');
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };


  const handleAddEmployee = async () => {
    try {
      if (!newEmployee.name || !newEmployee.familyName || !newEmployee.tel || !newEmployee.email || !newEmployee.password || !newEmployee.role || !newEmployee.Transporter_ID) {
        Alert.alert(
          user.language === 'English' ? 'Error' : 'Erreur',
          user.language === 'English'
            ? 'All fields must be filled out'
            : 'Tous les champs doivent être remplis'
        );
        return;
      }

      const response = await axios.post(`${URL}/api/employee/register`, {
        ...newEmployee,
        dsp_code: user.dsp_code,
      });
      setEmployees([...employees, response.data]);
      setFilteredEmployees([...employees, response.data]);
      setNewEmployeeModalVisible(false);
      Alert.alert(
        user.language === 'English' ? 'Success' : 'Succès',
        user.language === 'English'
          ? 'New employee added'
          : 'Nouvel employé ajouté'
      );
    } catch (error) {
      console.error('Error adding a new employee:', error);
    }
  };

  const getBackgroundColor = (scoreCard: string) => {
    switch (scoreCard) {
      case 'Fantastic':
        return '#ADD8E6'; // Light blue
      case 'Great':
        return '#90EE90'; // Light green
      case 'Fair':
        return '#ffcc00'; // Yellow
      case 'Poor':
        return '#ff3333'; // Red
      default:
        return '#808080'; // Default gray
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    const filtered = employees.filter(employee =>
      employee.name.toLowerCase().includes(text.toLowerCase()) || employee.familyName.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredEmployees(filtered);
  };

  return (
    <View style={styles.container}>
  <Text style={styles.title}>
    {user.language === 'English' ? 'Employee List' : 'Liste des employés'}
  </Text>

  {/* Loading indicator */}
  {loading ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#001933" />
      <Text style={styles.loadingText}>
        {user.language === 'English' ? 'Loading...' : 'Chargement...'}
      </Text>
    </View>
  ) : (
    <>
      {/* Add a button to refresh the employee list and a search bar */}
      <View style={styles.buttonContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder={user.language === 'English' ? 'Search Employee' : 'Rechercher un employé'}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {Platform.OS === "web" && (
          <Pressable style={styles.buttonRefresh} onPress={onRefresh}>
            <Text style={styles.buttonText}>
              {user.language === 'English' ? 'Refresh' : 'Actualiser'}
            </Text>
          </Pressable>
        )}
      </View>

      {Platform.OS === 'web' ? (
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredEmployees.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={[styles.employeeItem, { backgroundColor: getBackgroundColor(item.scoreCard) }]}
              onPress={() => handleOpenModal(item)} // Ouvre le modal avec les détails
            >
              <Text style={styles.employeeText}>
                {item.name} {item.familyName} - {item.scoreCard}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.employeeItem, { backgroundColor: getBackgroundColor(item.scoreCard) }]}
              onPress={() => handleOpenModal(item)} // Ouvre le modal avec les détails
            >
              <Text style={styles.employeeText}>
                {item.name} {item.familyName} - {item.scoreCard}
              </Text>
            </TouchableOpacity>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      <Pressable
        style={styles.floatingButton}
        onPress={() => setNewEmployeeModalVisible(true)} // Afficher le modal
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </Pressable>
    </>
  )}

      {/* Modal to add a new employee */}
      <Modal visible={newEmployeeModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>
            {user.language === 'English' ? 'Add Employee' : 'Ajouter un employé'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder={user.language === 'English' ? 'First Name' : 'Prénom'}
            value={newEmployee.name || ''}
            onChangeText={(text) => setNewEmployee({ ...newEmployee, name: text })}
          />

          <TextInput
            style={styles.input}
            placeholder={user.language === 'English' ? 'Last Name' : 'Nom de famille'}
            value={newEmployee.familyName || ''}
            onChangeText={(text) => setNewEmployee({ ...newEmployee, familyName: text })}
          />

          <TextInput
            style={styles.input}
            placeholder={user.language === 'English' ? 'Phone' : 'Téléphone'}
            value={newEmployee.tel || ''}
            onChangeText={(text) => setNewEmployee({ ...newEmployee, tel: text })}
          />

          <TextInput
            style={styles.input}
            placeholder={user.language === 'English' ? 'Email' : 'Email'}
            value={newEmployee.email || ''}
            onChangeText={(text) => setNewEmployee({ ...newEmployee, email: text })}
          />

          <TextInput
            style={styles.input}
            placeholder={user.language === 'English' ? 'Password' : 'Mot de passe'}
            value={newEmployee.password || ''}
            onChangeText={(text) => setNewEmployee({ ...newEmployee, password: text })}
          />

          <TextInput
            style={styles.input}
            placeholder={user.language === 'English' ? 'Transporter ID' : 'ID du transporteur'}
            value={newEmployee.Transporter_ID || ''}
            onChangeText={(text) => setNewEmployee({ ...newEmployee, Transporter_ID: text })}
          />

          <Text style={styles.label}>
            {user.language === 'English' ? 'Role' : 'Rôle'}
          </Text>

          <PickerModal
            title="Select Role" // Texte utilisé comme placeholder ou première option
            options={[
              { label: 'Driver', value: 'driver' },
              { label: 'Manager', value: 'manager' },
            ]}
            selectedValue={newEmployee.role}
            onValueChange={(value) => setNewEmployee({ ...newEmployee, role: value })}
          />

          <Pressable style={styles.buttonAdd} onPress={handleAddEmployee}>
            <Text style={styles.buttonText}>
              {user.language === 'English' ? 'Add' : 'Ajouter'}
            </Text>
          </Pressable>
          <Pressable style={styles.buttonClose} onPress={() => setNewEmployeeModalVisible(false)}>
            <Text style={styles.buttonTextClose}>
              {user.language === 'English' ? 'Close' : 'Fermer'}
            </Text>

          </Pressable>
        </View>
      </Modal>

      {/* Modal for employee details */}
      {selectedEmployee && (
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>
              {user.language === 'English' ? 'Employee Details' : 'Détails de l\'employé'}
            </Text>

            <TextInput
              style={styles.input}
              value={updatedEmployee?.name || ''}
              onChangeText={(text) => setUpdatedEmployee({ ...updatedEmployee!, name: text })}
              placeholder={user.language === 'English' ? 'First Name' : 'Prénom'}
            />

            <TextInput
              style={styles.input}
              value={updatedEmployee?.familyName || ''}
              onChangeText={(text) => setUpdatedEmployee({ ...updatedEmployee!, familyName: text })}
              placeholder={user.language === 'English' ? 'Last Name' : 'Nom de famille'}
            />

            <TextInput
              style={styles.input}
              value={updatedEmployee?.tel || ''}
              onChangeText={(text) => setUpdatedEmployee({ ...updatedEmployee!, tel: text })}
              placeholder={user.language === 'English' ? 'Phone' : 'Téléphone'}
            />

            <TextInput
              style={styles.input}
              value={updatedEmployee?.email || ''}
              onChangeText={(text) => setUpdatedEmployee({ ...updatedEmployee!, email: text })}
              placeholder={user.language === 'English' ? 'Email' : 'Email'}
            />

            <TextInput
              style={styles.input}
              value={updatedEmployee?.password || ''}
              onChangeText={(text) => setUpdatedEmployee({ ...updatedEmployee!, password: text })}
              placeholder={user.language === 'English' ? 'Password' : 'Mot de passe'}
            />

            <TextInput
              style={styles.input}
              value={updatedEmployee?.Transporter_ID || ''}
              onChangeText={(text) => setUpdatedEmployee({ ...updatedEmployee!, Transporter_ID: text })}
              placeholder={user.language === 'English' ? 'Transporter ID' : 'ID du transporteur'}
            />

            <Text style={styles.label}>
              {user.language === 'English' ? 'Role' : 'Rôle'}
            </Text>

            <PickerModal
              title="Select Role" // Texte utilisé comme placeholder ou première option
              options={[
                { label: 'Driver', value: 'driver' },
                { label: 'Manager', value: 'manager' },
              ]}
              selectedValue={updatedEmployee?.role || ''} // Gestion des cas où updatedEmployee pourrait être null
              onValueChange={(value) =>
                setUpdatedEmployee((prev) => ({ ...prev!, role: value }))
              }
            />

            <Text style={styles.label}>Score: {updatedEmployee?.scoreCard}</Text>

            <View style={styles.modalButtonContainer}>
              <Pressable style={[styles.buttonModal, styles.buttonUpdate]} onPress={handleUpdateEmployee}>
                <Text style={styles.buttonText}>
                  {user.language === 'English' ? 'Update' : 'Mettre à jour'}
                </Text>

              </Pressable>
              <Pressable style={[styles.buttonModal, styles.buttonDelete]} onPress={() => handleDeleteEmployee(selectedEmployee._id)}>
                <Text style={styles.buttonText}>
                  {user.language === 'English' ? 'Delete' : 'Supprimer'}
                </Text>

              </Pressable>
              <Pressable style={[styles.buttonModal, styles.buttonCloseUpdate]} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonTextClose}>
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

export default AllEmployees;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#001933', // Couleur bleu foncé pour le texte
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20, // Distance du bas de la page
    right: 30, // Distance du côté droit
    backgroundColor: '#001933', // Couleur bleu foncé
    width: 60, // Largeur du cercle
    height: 60, // Hauteur du cercle
    borderRadius: 30, // Pour rendre le bouton circulaire
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, // Ombre sur Android
    shadowColor: '#000', // Ombre sur iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  floatingButtonText: {
    color: '#fff', // Couleur du texte (blanc)
    fontSize: 24, // Taille de la police
    fontWeight: 'bold', // Texte en gras
    textAlign: 'center',
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white', // Arrière-plan blanc
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#001933', // Texte bleu foncé pour contraste
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#f0f0f0', // Gris clair pour contraste léger sur fond blanc
    borderRadius: 8,
    paddingHorizontal: 8,
    marginRight: 10,
    height: 40,
    borderColor: '#001933', // Bordure bleu foncé
    borderWidth: 1,
  },
  buttonRefresh: {
    backgroundColor: '#001933', // Bleu foncé pour le bouton de rafraîchissement
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonAdd: {
    backgroundColor: '#001933', // Bleu foncé pour le bouton d'ajout
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff', // Texte blanc pour contraste sur le bouton bleu foncé
    fontWeight: 'bold',
  },
  employeeItem: {
    backgroundColor: '#f9f9f9', // Fond légèrement gris pour les items
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
  },
  employeeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#001933', // Texte bleu foncé
  },
  modalView: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'white', // Arrière-plan blanc pour le modal
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#001933', // Texte bleu foncé
  },
  input: {
    height: 40,
    borderColor: '#1A237E', // Bordure bleu foncé
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f0f0f0', // Fond légèrement gris pour input
    color: '#000', // Texte noir pour contraste
  },
  pickerContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#001933', // Bordure bleu foncé
    backgroundColor: '#f0f0f0', // Fond légèrement gris
    marginBottom: 12,
    padding: 10,
  },
  picker: {
    height: 50,
    color: '#000', // Texte noir pour le picker
  },
  buttonClose: {
    backgroundColor: '#cccccc', // Fond gris clair pour le bouton de fermeture
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonTextClose: {
    color: '#000', // Texte noir pour contraste sur bouton clair
    fontWeight: 'bold',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  buttonModal: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonDelete: {
    backgroundColor: '#ff3333', // Rouge vif pour le bouton de suppression
  },
  buttonUpdate: {
    backgroundColor: '#001933', // Bleu foncé pour le bouton de mise à jour
  },
  buttonCloseUpdate: {
    backgroundColor: '#cccccc', // Gris clair pour le bouton de fermeture
  },
  label: {
    color: '#1A237E', // Texte bleu foncé
    fontWeight: 'bold',
  },
});
