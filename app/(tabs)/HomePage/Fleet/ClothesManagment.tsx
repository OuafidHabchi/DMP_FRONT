import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  Button,
  ScrollView,
  Platform,
} from 'react-native';
import axios from 'axios';
import { useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';


// Define types
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

interface Employee {
  _id: string;
  name: string;
  familyName: string;
}

interface Clothes {
  _id: string;
  type: string;
  size: string;
  quantite: number;
  date: string;
  createdBy: string;
}

interface Assignment {
  _id: string;
  clothesId: string;
  employeeId: string;
  quantite: number;
  date: string;
  createdBy: string;
}

const URL_Employee = 'https://coral-app-wqv9l.ondigitalocean.app';
const URL_Clothes = 'https://coral-app-wqv9l.ondigitalocean.app';
const URL_Assignments = 'https://coral-app-wqv9l.ondigitalocean.app';

const ClothesManagement: React.FC = () => {
  const route = useRoute();
  const { user } = route.params as { user: User };

  // State for employees, clothes, and assignments
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchText, setSearchText] = useState('');
  const [clothes, setClothes] = useState<Clothes[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Modal visibility states
  const [isClothesModalVisible, setClothesModalVisible] = useState(false);
  const [isAddClothesModalVisible, setAddClothesModalVisible] = useState(false);
  const [isAssignmentModalVisible, setAssignmentModalVisible] = useState(false);
  const [isAddAssignmentModalVisible, setAddAssignmentModalVisible] = useState(false);
  // State for adding assignments
  const [newAssignmentData, setNewAssignmentData] = useState<Partial<Assignment>>({});
  const [selectedClothes, setSelectedClothes] = useState<Partial<Clothes> | null>(null);
  const [selectedClothesType, setSelectedClothesType] = useState<string | null>(null);
  const [isEditDeleteModalVisible, setEditDeleteModalVisible] = useState(false);
  const [isStockModalVisible, setStockModalVisible] = useState(false);
  // Form state for adding clothes
  const [newClothes, setNewClothes] = useState({ type: '', size: '', quantite: 0 });

  // Load data on component mount
  useEffect(() => {
    fetchEmployees();
    fetchClothes();
    fetchAllAssignments();
  }, []);

  const fetchAllAssignments = async () => {
    try {
      const response = await axios.get<Assignment[]>(`${URL_Assignments}/api/clothesAssignment/assignments`, {
        params: { dsp_code: user.dsp_code }, // Ajout de dsp_code
      });
      setAssignments(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des assignations :", error);
    }
  };
  

  const fetchEmployees = async () => {
    try {
      const response = await axios.get<Employee[]>(`${URL_Employee}/api/employee`, {
        params: { dsp_code: user.dsp_code }, // Ajout de dsp_code
      });
      setEmployees(response.data);
      setFilteredEmployees(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des employés :', error);
    }
  };
  

  const fetchClothes = async () => {
    try {
      const response = await axios.get<Clothes[]>(`${URL_Clothes}/api/clothes/clothes`, {
        params: { dsp_code: user.dsp_code }, // Ajout de dsp_code
      });
      setClothes(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des vêtements :', error);
    }
  };
  

  const fetchAssignments = async (employeeId: string) => {
    try {
      const response = await axios.get<Assignment[]>(`${URL_Assignments}/api/clothesAssignment/assignments`, {
        params: {
          dsp_code: user.dsp_code, // Ajout de dsp_code
        },
      });
      const filteredAssignments = response.data.filter(
        (assignment) => assignment.employeeId === employeeId
      );
      setAssignments(filteredAssignments);
    } catch (error) {
      console.error('Erreur lors du chargement des assignations :', error);
    }
  };
  


  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      setFilteredEmployees(
        employees.filter((employee) =>
          employee.name.toLowerCase().includes(text.toLowerCase())
        )
      );
    }
  };

  const toggleClothesModal = () => setClothesModalVisible(!isClothesModalVisible);

  const openAddClothesModal = () => setAddClothesModalVisible(true);
  const closeAddClothesModal = () => setAddClothesModalVisible(false);

  const openEditDeleteModal = (clothes: Clothes) => {
    setSelectedClothes(clothes); // Définit le vêtement sélectionné
    setEditDeleteModalVisible(true); // Ouvre le modal contextuel
  };

  const closeEditDeleteModal = () => {
    setSelectedClothes(null); // Réinitialise la sélection
    setEditDeleteModalVisible(false); // Ferme le modal contextuel
  };

  const openAssignmentModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    fetchAssignments(employee._id);
    setAssignmentModalVisible(true);
  };

  const closeAssignmentModal = () => {
    setSelectedEmployee(null);
    setAssignmentModalVisible(false);
  };

  const openAddAssignmentModal = () => setAddAssignmentModalVisible(true);

  const closeAddAssignmentModal = () => {
    setSelectedClothesType(null); // Réinitialise la sélection
    setAddAssignmentModalVisible(false);
  };

  const openStockModal = () => setStockModalVisible(true);
  const closeStockModal = () => setStockModalVisible(false);

  const addNewClothes = async () => {
    try {
      const response = await axios.post(`${URL_Clothes}/api/clothes/clothes`, {
        ...newClothes,
        dsp_code: user.dsp_code, // Ajout de dsp_code
        date: new Date().toISOString(),
        createdBy: user._id, // ID de l'utilisateur connecté
      });
      console.log('Vêtement créé avec succès :', response.data);
      fetchClothes(); // Recharger la liste des vêtements
      closeAddClothesModal();
    } catch (error) {
      console.error('Erreur lors de la création du vêtement :', error);
    }
  };
  

  const updateClothes = async (id: string, updatedData: Partial<Clothes>) => {
    try {
      const response = await axios.put(`${URL_Clothes}/api/clothes/clothes/${id}`, {
        ...updatedData,
        dsp_code: user.dsp_code, // Ajout de dsp_code
      });
      console.log('Vêtement mis à jour :', response.data);
      fetchClothes(); // Recharger les vêtements après mise à jour
    } catch (error) {
      console.error('Erreur lors de la mise à jour du vêtement :', error);
    }
  };

  
  const deleteClothes = async (id: string) => {
    try {
      await axios.delete(`${URL_Clothes}/api/clothes/clothes/${id}`, {
        params: { dsp_code: user.dsp_code }, // Ajout de dsp_code
      });
      console.log('Vêtement supprimé.');
      fetchClothes(); // Recharger les vêtements après suppression
    } catch (error) {
      console.error('Erreur lors de la suppression du vêtement :', error);
    }
  };

  
  const addNewAssignment = async (assignmentData: Partial<Assignment>) => {
    try {
      const response = await axios.post(`${URL_Assignments}/api/clothesAssignment/assignments`, {
        ...assignmentData,
        dsp_code: user.dsp_code, // Ajout de dsp_code
        createdBy: user._id, // ID de l'utilisateur connecté
      });
      console.log('Assignation créée :', response.data);
      fetchAssignments(selectedEmployee?._id || ''); // Recharger les assignations de l'employé
      closeAddAssignmentModal();
    } catch (error) {
      console.error('Erreur lors de la création de l\'assignation :', error);
    }
  };

  
  const deleteAssignment = async (id: string) => {
    try {
      await axios.delete(`${URL_Assignments}/api/clothesAssignment/assignments/${id}`, {
        params: { dsp_code: user.dsp_code }, // Ajout de dsp_code
      });
      console.log('Assignation supprimée.');
      fetchAssignments(selectedEmployee?._id || ''); // Recharger les assignations après suppression
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'assignation :', error);
    }
  };
  

  const getClothesDetails = (clothesId: string) => {
    return clothes.find((clothing) => clothing._id === clothesId);
  };

  const extractDate = (isoDate: string) => isoDate.split('T')[0];

  const calculateRemainingQuantities = () => {
    return clothes.map(item => {
      const assignedQuantity = assignments
        .filter(assignment => assignment.clothesId === item._id) // Filtrer les assignations par vêtement
        .reduce((total, assignment) => total + assignment.quantite, 0); // Somme des quantités assignées
      return { ...item, remaining: item.quantite - assignedQuantity }; // Quantité restante
    });
  };





  return (
    <View style={styles.container}>
      {/* Search bar */}
      <TextInput
        style={styles.searchBar}
        placeholder={user.language === 'English' ? 'Search for an employee' : 'Rechercher un employé'}
        value={searchText}
        onChangeText={handleSearch}
      />


      {/* Employees list */}
      {Platform.OS === 'web' ? (
        // ScrollView for web
        <ScrollView>
          {filteredEmployees.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.employeeItem}
              onPress={() => openAssignmentModal(item)}
            >
              <Text style={styles.employeeName}>{item.name} {item.familyName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        // FlatList for mobile
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.employeeItem}
              onPress={() => openAssignmentModal(item)}
            >
              <Text style={styles.employeeName}>{item.name} {item.familyName}</Text>
            </TouchableOpacity>
          )}
        />
      )}


      {Platform.OS === 'web' ? (
        <TouchableOpacity style={styles.floatingStockButton} onPress={openStockModal}>
          <MaterialIcons name="bar-chart" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.floatingStockButtonMobile} onPress={openStockModal}>
          <MaterialIcons name="bar-chart" size={24} color="#fff" />
        </TouchableOpacity>
      )}




      {/* Floating button for clothes */}
      {Platform.OS === 'web' ? (
        <TouchableOpacity style={styles.floatingAddButton} onPress={toggleClothesModal}>
          <Text style={styles.floatingAddButtonText}>👕</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.floatingAddButtonMobile} onPress={toggleClothesModal}>
          <Text style={styles.floatingAddButtonText}>👕</Text>
        </TouchableOpacity>
      )}




      {/* Clothes modal */}
      <Modal visible={isClothesModalVisible} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalHeader}>
            {user.language === 'English' ? 'Clothing Management' : 'Gestion des Vêtements'}
          </Text>
          <FlatList
            data={clothes}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.clothesItem}
                onPress={() => openEditDeleteModal(item)}
              >
                <Text style={styles.assignmentText}>{item.type}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.secondaryButton} onPress={toggleClothesModal}>
            <Text style={styles.secondaryButtonText}>
              {user.language === 'English' ? 'Close' : 'Fermer'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.floatingAddButton} onPress={openAddClothesModal}>
            <Text style={styles.floatingAddButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </Modal>



      {/* Add Clothes Modal */}
      <Modal visible={isAddClothesModalVisible} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalHeader}>
            {user.language === 'English' ? 'Create New Clothing' : 'Créer un Nouveau Vêtement'}
          </Text>
          <View style={styles.modalSection}>
            <TextInput
              style={styles.input}
              placeholder="Type"
              onChangeText={(text) => setNewClothes({ ...newClothes, type: text })}
            />
            <TextInput
              style={styles.input}
              placeholder={user.language === 'English' ? 'Size' : 'Taille'}
              onChangeText={(text) => setNewClothes({ ...newClothes, size: text })}
            />
            <TextInput
              style={styles.input}
              placeholder={user.language === 'English' ? 'Quantity' : 'Quantité'}
              keyboardType="numeric"
              onChangeText={(text) => setNewClothes({ ...newClothes, quantite: parseInt(text) })}
            />
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={addNewClothes}>
            <Text style={styles.primaryButtonText}>
              {user.language === 'English' ? 'Create' : 'Créer'}
            </Text>

          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={closeAddClothesModal}>
            <Text style={styles.secondaryButtonText}>
              {user.language === 'English' ? 'Close' : 'Fermer'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>


      {/* Update Clothes Modal */}
      <Modal visible={isEditDeleteModalVisible} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalHeader}>
            {user.language === 'English' ? 'Edit or Delete' : 'Modifier ou Supprimer'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Edit Type"
            defaultValue={selectedClothes?.type}
            onChangeText={(text) =>
              setSelectedClothes({ ...selectedClothes, type: text })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Edit Size"
            defaultValue={selectedClothes?.size}
            onChangeText={(text) =>
              setSelectedClothes({ ...selectedClothes, size: text })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Edit Quantity"
            defaultValue={selectedClothes?.quantite ? selectedClothes.quantite.toString() : ''}
            onChangeText={(text) =>
              setSelectedClothes({
                ...selectedClothes,
                quantite: parseInt(text) || 0, // Convert back to number
              })
            }
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              updateClothes(selectedClothes?._id || '', selectedClothes || {});
              closeEditDeleteModal();
            }}
          >
            <Text style={styles.primaryButtonText}>
              {user.language === 'English' ? 'Edit' : 'Modifier'}
            </Text>

          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButtonUpdate}
            onPress={() => {
              deleteClothes(selectedClothes?._id || '');
              closeEditDeleteModal();
            }}
          >
            <Text style={styles.secondaryButtonText}>
              {user.language === 'English' ? 'Delete' : 'Supprimer'}
            </Text>

          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={closeEditDeleteModal}>
            <Text style={styles.secondaryButtonText}>
              {user.language === 'English' ? 'Close' : 'Fermer'}
            </Text>

          </TouchableOpacity>
        </View>
      </Modal>




      {/* Assignments modal */}
      <Modal visible={isAssignmentModalVisible} animationType="fade" transparent>
        <View style={Platform.OS === 'web' ? styles.assignmentModalBackdropWeb : styles.assignmentModalBackdrop}>
          <View style={Platform.OS === 'web' ? styles.assignmentModalContainerWeb : styles.assignmentModalContainer}>
            <Text style={styles.assignmentModalTitle}>
              {user.language === 'English'
                ? `Clothes Given to ${selectedEmployee?.name}`
                : `Vêtements Donnés à ${selectedEmployee?.name}`}
            </Text>

            <FlatList
              data={assignments}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={styles.assignmentModalItem}>
                  <View>
                    <Text style={styles.assignmentModalItemText}>
                      {user.language === 'English'
                        ? `Type: ${getClothesDetails(item.clothesId)?.type || 'N/A'}`
                        : `Type: ${getClothesDetails(item.clothesId)?.type || 'Non disponible'}`}
                    </Text>
                    <Text style={styles.assignmentModalItemText}>
                      {user.language === 'English' ? `Quantity: ${item.quantite}` : `Quantité: ${item.quantite}`}
                    </Text>
                    <Text style={styles.assignmentModalItemText}>
                      {user.language === 'English'
                        ? `Given by: ${employees.find((employee) => employee._id === item.createdBy)?.name || 'Unknown'} ${employees.find((employee) => employee._id === item.createdBy)?.familyName || ''}`
                        : `Donné par: ${employees.find((employee) => employee._id === item.createdBy)?.name || 'Inconnu'} ${employees.find((employee) => employee._id === item.createdBy)?.familyName || ''}`}
                    </Text>
                    <Text style={styles.assignmentModalItemText}>
                      {user.language === 'English' ? `On: ${extractDate(item.date)}` : `Le: ${extractDate(item.date)}`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.assignmentModalDeleteButton}
                    onPress={() => deleteAssignment(item._id)}
                  >
                    <Text style={styles.assignmentModalDeleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            <View style={styles.assignmentModalFooter}>
              <TouchableOpacity
                style={styles.assignmentModalActionButtonAjouter}
                onPress={openAddAssignmentModal}
              >
                <Text style={styles.assignmentModalActionText}>
                  {user.language === 'English' ? '+ Add' : '+ Ajouter'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.assignmentModalActionButtonSecondary}
                onPress={closeAssignmentModal}
              >
                <Text style={styles.assignmentModalActionTextSecondary}>
                  {user.language === 'English' ? 'Close' : 'Fermer'}
                </Text>

              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>







      {/* Add Assignment Modal  */}
      <Modal visible={isAddAssignmentModalVisible} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalHeader}>
            {user.language === 'English' ? 'Give' : 'Donner'}
          </Text>

          <View style={styles.modalSection}>
            <Text style={styles.pickerLabel}>
              {user.language === 'English' ? 'Select Clothing Type:' : 'Sélectionner le Type de Vêtement :'}
            </Text>

            <Picker
              selectedValue={selectedClothesType || ''}
              onValueChange={(itemValue) => setSelectedClothesType(itemValue)}
              style={styles.picker}
            >
              <Picker.Item
                label={user.language === 'English' ? 'Select a clothing type' : 'Sélectionner un type de vêtement'}
                value=""
              />
              {clothes.map((item) => (
                <Picker.Item key={item._id} label={item.type} value={item._id} />
              ))}
            </Picker>
            <TextInput
              style={styles.input}
              placeholder={user.language === 'English' ? 'Quantity' : 'Quantité'}
              keyboardType="numeric"
              onChangeText={(text) =>
                setNewAssignmentData({
                  ...newAssignmentData,
                  quantite: parseInt(text, 10),
                })
              }
            />
          </View>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              if (selectedClothesType) {
                addNewAssignment({
                  ...newAssignmentData,
                  clothesId: selectedClothesType,
                  employeeId: selectedEmployee?._id,
                });
                closeAddAssignmentModal();
              }
            }}
          >
            <Text style={styles.primaryButtonText}>
              {user.language === 'English' ? 'Create' : 'Créer'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={closeAddAssignmentModal}>
            <Text style={styles.secondaryButtonText}>
              {user.language === 'English' ? 'Close' : 'Fermer'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>


      {/* Stock Modal  */}
      <Modal visible={isStockModalVisible} animationType="slide">
        <View style={styles.stockModalContent}>
          {/* Header */}
          <Text style={styles.stockModalHeader}>Stock</Text>

          {/* List of Clothes */}
          <FlatList
            data={calculateRemainingQuantities()}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View style={styles.stockCard}>
                {/* Icon for the clothing */}
                <View style={styles.stockIcon}>
                  <Text style={styles.stockIconText}>👕</Text>
                </View>

                {/* Text Information */}
                <View style={styles.stockCardTextContainer}>
                  <Text style={styles.stockCardTitle}>
                    {user.language === 'English'
                      ? `${item.type} - Size: ${item.size}`
                      : `${item.type} - Taille : ${item.size}`}
                  </Text>
                  <Text style={styles.stockCardSubtitle}>
                    {user.language === 'English'
                      ? `Remaining Quantity: `
                      : `Quantité Restante: `}
                    <Text
                      style={[
                        styles.stockCardHighlight,
                        item.remaining <= 10 && styles.stockCardLowQuantity, // Conditional styling
                      ]}
                    >
                      {item.remaining}
                    </Text>
                  </Text>

                </View>
              </View>
            )}
          />

          {/* Footer with Close Button */}
          <TouchableOpacity style={styles.stockCloseButton} onPress={closeStockModal}>
            <Text style={styles.stockCloseButtonText}>
              {user.language === 'English' ? 'Close' : 'Fermer'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9fafc', // Couleur d'arrière-plan douce
  },
  searchBar: {
    height: 50,
    borderColor: '#001933', // Couleur principale
    borderWidth: 1,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: '#fff',
    fontSize: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  employeeItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#001933',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 90,
    right: 30,
    backgroundColor: '#001933', // Couleur verte pour indiquer "ajouter"
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
  },
  floatingAddButtonMobile: {
    position: 'absolute',
    bottom: 40,
    right: 30,
    backgroundColor: '#001933', // Couleur verte pour indiquer "ajouter"
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
  },
  floatingAddButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#001933',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: '#cbd5e0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f7fafc',
    fontSize: 16,
    marginBottom: 15,
  },
  primaryButton: {
    backgroundColor: '#001933',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 15,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#edf2f7',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 15,
  },
  secondaryButtonUpdate: {
    backgroundColor: 'red',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 15,
  },
  secondaryButtonText: {
    color: '#001933',
    fontSize: 16,
    fontWeight: 'bold',
  },
  picker: {
    height: 50,
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 10,
    backgroundColor: '#f7fafc',
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 16,
    color: '#4a5568',
    marginBottom: 10,
  },
  assignmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  assignmentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a5568',
  },
  clothesItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clothesActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCloseIcon: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#e0e0e0',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseIconText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  }, modalSection: {
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#ff6f61', // Rouge doux ou une couleur de votre choix
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20, // Marge pour espacement en bas
    marginHorizontal: 40, // Marge horizontale pour éviter que le bouton soit trop large
    alignSelf: 'center', // Centrer le bouton
    shadowColor: '#000', // Ombre subtile
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  closeButtonText: {
    color: '#fff', // Texte blanc
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase', // Texte en majuscule
  },
  // Styles pour le mobile
  assignmentModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Fond sombre pour un focus sur le modal
  },
  assignmentModalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  // Styles pour le web
  assignmentModalBackdropWeb: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignmentModalContainerWeb: {
    width: '50%',
    maxHeight: '70%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 30,
    overflowY: 'auto', // Permet un défilement si le contenu dépasse
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)', // Effet d'ombre propre au web
  },

  // Commun aux deux plateformes
  assignmentModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
    textAlign: 'center',
  },
  assignmentModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    width: '100%',
    boxShadow: Platform.OS === 'web' ? '0px 2px 5px rgba(0, 0, 0, 0.1)' : 'none',
    elevation: Platform.OS === 'web' ? 0 : 3,
  },
  assignmentModalItemText: {
    fontSize: 16,
    color: '#555555',
  },
  assignmentModalDeleteButton: {
    backgroundColor: '#ff4d4f',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  assignmentModalDeleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  assignmentModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  assignmentModalActionButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  assignmentModalActionButtonAjouter: {
    flex: 1,
    backgroundColor: '#001933',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  assignmentModalActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  assignmentModalActionButtonSecondary: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 10,
    alignItems: 'center',
  },
  assignmentModalActionTextSecondary: {
    color: '#555555',
    fontSize: 16,
    fontWeight: '600',
  },
  floatingStockButton: {
    position: 'absolute',
    bottom: 160, // Placez-le au-dessus du bouton existant
    right: 30,
    backgroundColor: '#001933', // Couleur verte pour indiquer "quantité restante"
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
  },
  floatingStockButtonMobile: {
    position: 'absolute',
    bottom: 120, // Placez-le au-dessus du bouton existant
    right: 30,
    backgroundColor: '#001933',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
  },
  floatingStockButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  // Modal Container
  stockModalContent: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Header
  stockModalHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    backgroundColor: '#001933',
    paddingVertical: 15,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },

  // Card for each clothing item
  stockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
  },

  // Clothing icon or image
  stockIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#e2e8f0',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },

  stockIconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4caf50',
  },

  // Text inside the card
  stockCardTextContainer: {
    flex: 1,
  },

  stockCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#001933',
  },

  stockCardSubtitle: {
    fontSize: 14,
    color: '#4a5568',
    marginTop: 5,
  },

  stockCardHighlight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
  },

  // Close Button
  stockCloseButton: {
    backgroundColor: '#001933',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    alignSelf: 'center',
    width: '50%',
  },

  stockCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  stockCardLowQuantity: {
    color: '#ff4d4f', // Rouge vif
    fontWeight: 'bold',
  },



});


export default ClothesManagement;
