import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
  FlatList,
  Alert
} from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import AppURL from '@/components/src/URL';
import { useUser } from '@/context/UserContext';
import PickerModal from '@/components/src/PickerModal';


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


const ClothesManagement: React.FC = () => {
  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
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
  const [isLoading, setIsLoading] = useState(false);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [isCreateDisabled, setIsCreateDisabled] = useState<boolean>(false);




  // Load data on component mount
  useEffect(() => {
    fetchEmployees();
    fetchClothes();
    fetchAllAssignments();
  }, []);

  const fetchAllAssignments = async () => {
    try {
      const response = await axios.get<Assignment[]>(`${AppURL}/api/clothesAssignment/assignments`, {
        params: { dsp_code: user?.dsp_code }, // Ajout de dsp_code
      });
      setAssignments(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des assignations :", error);
    }
  };


  const fetchEmployees = async () => {
    try {
      const response = await axios.get<Employee[]>(`${AppURL}/api/employee`, {
        params: { dsp_code: user?.dsp_code }, // Ajout de dsp_code
      });
      setEmployees(response.data);
      setFilteredEmployees(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des employés :', error);
    }
  };


  const fetchClothes = async () => {
    try {
      const response = await axios.get<Clothes[]>(`${AppURL}/api/clothes/clothes`, {
        params: { dsp_code: user?.dsp_code }, // Ajout de dsp_code
      });
      setClothes(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des vêtements :', error);
    }
  };


  const fetchAssignments = async (employeeId: string) => {
    try {
      const response = await axios.get<Assignment[]>(`${AppURL}/api/clothesAssignment/assignments`, {
        params: {
          dsp_code: user?.dsp_code, // Ajout de dsp_code
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

  const closeAllModals = () => {
    setClothesModalVisible(false);
    setAddClothesModalVisible(false);
    setAssignmentModalVisible(false);
    setAddAssignmentModalVisible(false);
    setEditDeleteModalVisible(false);
    setStockModalVisible(false);
  };


  const toggleClothesModal = async () => {
    closeAllModals(); // Ferme les autres modals
    setIsLoading(true); // Active l’état de chargement

    try {
      // Récupère toutes les données nécessaires
      await fetchClothes(); // Charge les vêtements
      // Ouvre le modal une fois que toutes les données sont prêtes
      setClothesModalVisible(true);
    } catch (error) {
      console.error('Erreur lors de l’ouverture du modal de vêtements :', error);
    } finally {
      // Désactive l’indicateur de chargement une fois terminé
      setIsLoading(false);
    }
  };




  const openAddClothesModal = () => {
    closeAllModals();
    setAddClothesModalVisible(true);
  };
  const closeAddClothesModal = () => {
    closeAllModals();
  };

  const openEditDeleteModal = (clothes: Clothes) => {
    closeAllModals();
    setSelectedClothes(clothes); // Définit le vêtement sélectionné
    setEditDeleteModalVisible(true); // Ouvre le modal contextuel
  };

  const closeEditDeleteModal = () => {
    setSelectedClothes(null); // Réinitialise la sélection
    setEditDeleteModalVisible(false); // Ferme le modal contextuel
  };

  const openAssignmentModal = (employee: Employee) => {
    closeAllModals();
    setSelectedEmployee(employee);
    fetchAssignments(employee._id);
    setAssignmentModalVisible(true);
  };


  const closeAssignmentModal = () => {
    setSelectedEmployee(null);
    setAssignmentModalVisible(false);
  };

  const openAddAssignmentModal = () => {
    closeAllModals();
    setAddAssignmentModalVisible(true);
  };

  const closeAddAssignmentModal = () => {
    setSelectedClothesType(null); // Réinitialise la sélection
    setAddAssignmentModalVisible(false);
  };

  const openStockModal = async () => {
    closeAllModals(); // Ferme les autres modals
    setStockModalVisible(true); // Affiche le modal
    setIsLoading(true); // Active l’état de chargement

    try {
      // Recalcule les données nécessaires
      await fetchClothes(); // Charge les vêtements
      await fetchAllAssignments(); // Charge les assignations
      calculateRemainingQuantities(); // Recalcule les quantités restantes
    } catch (error) {
      console.error('Erreur lors de l’ouverture du modal de stock :', error);
    } finally {
      setIsLoading(false); // Désactive l’état de chargement
    }
  };

  const closeStockModal = () => {
    setStockModalVisible(false); // Ferme le modal
  };

  const addNewClothes = async () => {
    try {
      const response = await axios.post(`${AppURL}/api/clothes/clothes`, {
        ...newClothes,
        dsp_code: user?.dsp_code, // Ajout de dsp_code
        date: new Date().toISOString(),
        createdBy: user?._id, // ID de l'utilisateur connecté
      });

      fetchClothes(); // Recharger la liste des vêtements
      closeAddClothesModal();

      // Message de succès
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Clothing item added successfully!'
            : 'Vêtement ajouté avec succès !'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Success' : 'Succès',
          user?.language === 'English'
            ? 'Clothing item added successfully!'
            : 'Vêtement ajouté avec succès !'
        );
      }      

    } catch (error) {
      // Message d'échec
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Failed to add the clothing item.'
            : 'Échec de l’ajout du vêtement.'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Failed to add the clothing item.'
            : 'Échec de l’ajout du vêtement.'
        );
      }      
    }
  };



  const updateClothes = async (id: string, updatedData: Partial<Clothes>) => {
    try {
      const response = await axios.put(`${AppURL}/api/clothes/clothes/${id}`, {
        ...updatedData,
        dsp_code: user?.dsp_code, // Ajout de dsp_code
      });

      fetchClothes(); // Recharger les vêtements après mise à jour

      // Message de succès
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Clothing item updated successfully!'
            : 'Vêtement mis à jour avec succès !'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Success' : 'Succès',
          user?.language === 'English'
            ? 'Clothing item updated successfully!'
            : 'Vêtement mis à jour avec succès !'
        );
      }
      
    } catch (error) {
      // Message d'échec
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Failed to update the clothing item.'
            : 'Échec de la mise à jour du vêtement.'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Failed to update the clothing item.'
            : 'Échec de la mise à jour du vêtement.'
        );
      }      
    }
  };



  const deleteClothes = async (id: string) => {
    try {
      await axios.delete(`${AppURL}/api/clothes/clothes/${id}`, {
        params: { dsp_code: user?.dsp_code }, // Ajout de dsp_code
      });

      fetchClothes(); // Recharger les vêtements après suppression

      // Message de succès
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Clothing item deleted successfully!'
            : 'Vêtement supprimé avec succès !'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Success' : 'Succès',
          user?.language === 'English'
            ? 'Clothing item deleted successfully!'
            : 'Vêtement supprimé avec succès !'
        );
      }      

    } catch (error) {
      console.error('Erreur lors de la suppression du vêtement :', error);

      // Message d'échec
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Failed to delete the clothing item.'
            : 'Échec de la suppression du vêtement.'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Failed to delete the clothing item.'
            : 'Échec de la suppression du vêtement.'
        );
      }      
    }
  };


  const addNewAssignment = async (assignmentData: Partial<Assignment>) => {
    try {
      const response = await axios.post(`${AppURL}/api/clothesAssignment/assignments`, {
        ...assignmentData,
        dsp_code: user?.dsp_code, // Ajout de dsp_code
        createdBy: user?._id, // ID de l'utilisateur connecté
      });

      fetchAssignments(selectedEmployee?._id || ''); // Recharger les assignations de l'employé
      closeAddAssignmentModal();

      // Message de succès
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Assignment added successfully!'
            : 'Affectation ajoutée avec succès !'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Success' : 'Succès',
          user?.language === 'English'
            ? 'Assignment added successfully!'
            : 'Affectation ajoutée avec succès !'
        );
      }
      
    } catch (error) {
      // Message d'échec
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Failed to add the assignment.'
            : 'Échec de l’ajout de l’affectation.'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Failed to add the assignment.'
            : 'Échec de l’ajout de l’affectation.'
        );
      }      
    }
  };



  const deleteAssignment = async (id: string) => {
    try {
      await axios.delete(`${AppURL}/api/clothesAssignment/assignments/${id}`, {
        params: { dsp_code: user?.dsp_code }, // Ajout de dsp_code
      });

      fetchAssignments(selectedEmployee?._id || ''); // Recharger les assignations après suppression

      // Message de succès
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Assignment deleted successfully!'
            : 'Affectation supprimée avec succès !'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Success' : 'Succès',
          user?.language === 'English'
            ? 'Assignment deleted successfully!'
            : 'Affectation supprimée avec succès !'
        );
      }      

    } catch (error) {
      // Message d'échec
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Failed to delete the assignment.'
            : 'Échec de la suppression de l\'affectation.'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Failed to delete the assignment.'
            : 'Échec de la suppression de l\'affectation.'
        );
      }      
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
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder={user?.language === 'English' ? ' 🔍 Search for an employee' : ' 🔍 Rechercher un employé'}
          value={searchText}
          onChangeText={handleSearch}
        />
      </View>


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
      <Modal visible={isClothesModalVisible || isLoading} animationType="slide">
        <View style={styles.clothesModalContainer}>
          {isLoading ? (
            // Affiche l'indicateur de chargement pendant le temps de récupération des données
            <ActivityIndicator
              size="large"
              color="#001933"
              style={styles.loadingIndicator}
            />
          ) : (
            <>
              <Text style={styles.clothesModalHeader}>
                {user?.language === 'English' ? 'Clothing Management' : 'Gestion des Vêtements'}
              </Text>

              <ScrollView contentContainerStyle={styles.clothesModalScrollContent}>
                {clothes.map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.clothesItem}
                    onPress={() => openEditDeleteModal(item)}
                  >
                    <Text style={styles.assignmentText}>{item.type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {clothes.length === 0 && (
                <Text style={styles.emptyText}>
                  {user?.language === 'English'
                    ? 'No clothing items available.'
                    : 'Aucun vêtement disponible.'}
                </Text>
              )}

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setClothesModalVisible(false)}
              >
                <Text style={styles.secondaryButtonText}>
                  {user?.language === 'English' ? 'Close' : 'Fermer'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.floatingAddButton} onPress={openAddClothesModal}>
                <Text style={styles.floatingAddButtonText}>+</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>






      {/* Add Clothes Modal */}
      <Modal visible={isAddClothesModalVisible} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalHeader}>
            {user?.language === 'English' ? 'Create New Clothing' : 'Créer un Nouveau Vêtement'}
          </Text>
          <View style={styles.modalSection}>
            <TextInput
              style={styles.input}
              placeholder="Type"
              onChangeText={(text) => setNewClothes({ ...newClothes, type: text })}
            />
            <TextInput
              style={styles.input}
              placeholder={user?.language === 'English' ? 'Size' : 'Taille'}
              onChangeText={(text) => setNewClothes({ ...newClothes, size: text })}
            />
            <TextInput
              style={styles.input}
              placeholder={user?.language === 'English' ? 'Quantity' : 'Quantité'}
              keyboardType="numeric"
              onChangeText={(text) => setNewClothes({ ...newClothes, quantite: parseInt(text) })}
            />
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={addNewClothes}>
            <Text style={styles.primaryButtonText}>
              {user?.language === 'English' ? 'Create' : 'Créer'}
            </Text>

          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={closeAddClothesModal}>
            <Text style={styles.secondaryButtonText}>
              {user?.language === 'English' ? 'Close' : 'Fermer'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>


      {/* Update Clothes Modal */}
      <Modal visible={isEditDeleteModalVisible} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalHeader}>
            {user?.language === 'English' ? 'Edit or Delete' : 'Modifier ou Supprimer'}
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
              {user?.language === 'English' ? 'Edit' : 'Modifier'}
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
              {user?.language === 'English' ? 'Delete' : 'Supprimer'}
            </Text>

          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={closeEditDeleteModal}>
            <Text style={styles.secondaryButtonText}>
              {user?.language === 'English' ? 'Close' : 'Fermer'}
            </Text>

          </TouchableOpacity>
        </View>
      </Modal>




      {/* Assignments modal */}
      <Modal visible={isAssignmentModalVisible} animationType="fade" transparent>
        <View
          style={
            Platform.OS === 'web'
              ? styles.assignmentModalBackdropWeb
              : styles.assignmentModalBackdrop
          }
        >
          <View
            style={
              Platform.OS === 'web'
                ? styles.assignmentModalContainerWeb
                : styles.assignmentModalContainer
            }
          >
            <Text style={styles.assignmentModalTitle}>
              {user?.language === 'English'
                ? `Clothes Given to ${selectedEmployee?.name}`
                : `Vêtements Donnés à ${selectedEmployee?.name}`}
            </Text>

            <FlatList
              data={assignments}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={styles.assignmentModalItem}>
                  <View style={styles.assignmentModalTextContainer}>
                    <Text style={styles.assignmentModalItemText}>
                      {user?.language === 'English'
                        ? `Type: ${getClothesDetails(item.clothesId)?.type || 'N/A'}`
                        : `Type: ${getClothesDetails(item.clothesId)?.type || 'Non disponible'}`}
                    </Text>
                    <Text style={styles.assignmentModalItemText}>
                      {user?.language === 'English'
                        ? `Quantity: ${item.quantite}`
                        : `Quantité: ${item.quantite}`}
                    </Text>
                    <Text
                      style={styles.assignmentModalItemText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {user?.language === 'English'
                        ? `Given by: ${employees.find((employee) => employee._id === item.createdBy)?.name ||
                        'Unknown'
                        } ${employees.find((employee) => employee._id === item.createdBy)
                          ?.familyName || ''
                        }`
                        : `Donné par: ${employees.find((employee) => employee._id === item.createdBy)?.name ||
                        'Inconnu'
                        } ${employees.find((employee) => employee._id === item.createdBy)
                          ?.familyName || ''
                        }`}
                    </Text>
                    <Text style={styles.assignmentModalItemText}>
                      {user?.language === 'English'
                        ? `On: ${extractDate(item.date)}`
                        : `Le: ${extractDate(item.date)}`}
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
                  {user?.language === 'English' ? '+ Add' : '+ Ajouter'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.assignmentModalActionButtonSecondary}
                onPress={closeAssignmentModal}
              >
                <Text style={styles.assignmentModalActionTextSecondary}>
                  {user?.language === 'English' ? 'Close' : 'Fermer'}
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
            {user?.language === 'English' ? 'Give' : 'Donner'}
          </Text>

          <View style={styles.modalSection}>
            <Text style={styles.pickerLabel}>
              {user?.language === 'English' ? 'Select Clothing Type:' : 'Sélectionner le Type de Vêtement :'}
            </Text>

            <PickerModal
              title={user?.language === 'English' ? 'Select Clothing Type' : 'Sélectionner le Type de Vêtement'}
              options={clothes.map((item) => ({
                label: item.type,
                value: item._id,
              }))}
              selectedValue={selectedClothesType ?? ''}
              onValueChange={(value) => setSelectedClothesType(value)}
            />


            <TextInput
              style={styles.input}
              placeholder={user?.language === 'English' ? 'Quantity' : 'Quantité'}
              keyboardType="numeric"
              onChangeText={(text) => {
                const enteredQuantity = parseInt(text, 10);
                const selectedClothing = clothes.find(item => item._id === selectedClothesType);
                const remainingQuantity = selectedClothing ? selectedClothing.quantite - assignments
                  .filter(assignment => assignment.clothesId === selectedClothesType)
                  .reduce((total, assignment) => total + assignment.quantite, 0) : 0;

                if (enteredQuantity > remainingQuantity) {
                  setQuantityError(user?.language === 'English'
                    ? `Not enough stock available. Remaining: ${remainingQuantity}`
                    : `Stock insuffisant. Restant : ${remainingQuantity}`);
                  setIsCreateDisabled(true); // Désactiver le bouton "Create"
                } else {
                  setQuantityError(null);
                  setIsCreateDisabled(false); // Réactiver le bouton si la quantité est valide
                }

                setNewAssignmentData({
                  ...newAssignmentData,
                  quantite: enteredQuantity,
                });
              }}
            />

            {quantityError && <Text style={styles.errorText}>{quantityError}</Text>}

          </View>
          <TouchableOpacity
            style={[styles.primaryButton, isCreateDisabled && styles.disabledButton]}
            onPress={() => {
              if (selectedClothesType && !isCreateDisabled) {
                addNewAssignment({
                  ...newAssignmentData,
                  clothesId: selectedClothesType,
                  employeeId: selectedEmployee?._id,
                });
                closeAddAssignmentModal();
              }
            }}
            disabled={isCreateDisabled}
          >
            <Text style={styles.primaryButtonText}>
              {user?.language === 'English' ? 'Create' : 'Créer'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={closeAddAssignmentModal}>
            <Text style={styles.secondaryButtonText}>
              {user?.language === 'English' ? 'Close' : 'Fermer'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>


      {/* Stock Modal  */}
      <Modal
        visible={isStockModalVisible}
        animationType="slide"
        onShow={() => calculateRemainingQuantities()} // Recalcule les données après l'ouverture
      >
        <View style={styles.stockModalContent}>
          {/* Header */}
          <Text style={styles.stockModalHeader}>
            {user?.language === 'English' ? 'Stock' : 'Stock'}
          </Text>

          {/* Contenu défilable */}
          {isLoading ? (
            <ActivityIndicator size="large" color="#001933" style={styles.loadingIndicator} />
          ) : (
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
              {calculateRemainingQuantities().map((item) => (
                <View key={item._id} style={styles.stockCard}>
                  {/* Icon for the clothing */}
                  <View style={styles.stockIcon}>
                    <Text style={styles.stockIconText}>👕</Text>
                  </View>

                  {/* Text Information */}
                  <View style={styles.stockCardTextContainer}>
                    <Text style={styles.stockCardTitle}>
                      {user?.language === 'English'
                        ? `${item.type} - Size: ${item.size}`
                        : `${item.type} - Taille : ${item.size}`}
                    </Text>
                    <Text style={styles.stockCardSubtitle}>
                      {user?.language === 'English' ? 'Remaining Quantity: ' : 'Quantité Restante: '}
                      <Text
                        style={[
                          styles.stockCardHighlight,
                          item.remaining <= 10 && styles.stockCardLowQuantity, // Styling conditionnel
                        ]}
                      >
                        {item.remaining}
                      </Text>
                    </Text>
                  </View>
                </View>
              ))}

              {/* Message si aucune donnée */}
              {calculateRemainingQuantities().length === 0 && (
                <Text style={styles.emptyText}>
                  {user?.language === 'English'
                    ? 'No items in stock.'
                    : 'Aucun article en stock.'}
                </Text>
              )}
            </ScrollView>
          )}

          {/* Footer avec bouton "Close" */}
          <TouchableOpacity style={styles.stockCloseButton} onPress={closeStockModal}>
            <Text style={styles.stockCloseButtonText}>
              {user?.language === 'English' ? 'Close' : 'Fermer'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>



    </View>
  );
};

const styles = StyleSheet.create({
  disabledButton: {
    backgroundColor: '#ccc', // Gris pour indiquer que le bouton est désactivé
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: 5,
  },
  clothesModalContainer: {
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
  clothesModalHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#001933',
    marginBottom: 15,
    textAlign: 'center',
  },
  clothesModalScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9fafc', // Couleur d'arrière-plan douce
  },
  searchBarContainer: {
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
    borderColor: '#001933',
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
  assignmentModalTextContainer: {
    flex: 1,
    marginRight: 10, // Espace entre le texte et le bouton
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
    maxHeight: '100%', // Empêche le contenu de dépasser l'écran
  },
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
  scrollViewContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
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
  stockCardLowQuantity: {
    color: '#ff4d4f', // Rouge vif pour les faibles quantités
    fontWeight: 'bold',
  },
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
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#555',
    fontSize: 16,
    marginTop: 20,
  },

});


export default ClothesManagement;
