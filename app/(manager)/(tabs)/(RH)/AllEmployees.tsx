import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Modal, TextInput, Pressable, Alert, RefreshControl, Platform, ScrollView, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AppURL from '@/components/src/URL';
import PickerModal from '@/components/src/PickerModal';
import { useUser } from '@/context/UserContext';


// Base URL without protocol or port
const URL = AppURL;

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

type Invitation = {
  _id: string;
  email: string;
  createdAt: string;
  fonctionnel: boolean;
  dateCreation: string;
};

const AllEmployees = () => {
  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [updatedEmployee, setUpdatedEmployee] = useState<Employee | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewInvitationsModalVisible, setViewInvitationsModalVisible] = useState(false);
  const [isEmailUsed, setIsEmailUsed] = useState(false);
  const [searchInvitationQuery, setSearchInvitationQuery] = useState('');
  const [filteredInvitations, setFilteredInvitations] = useState<Invitation[]>([]);

  // 🔥 Filtrer les invitations
  useEffect(() => {
    const filtered = invitations.filter(invitation =>
      invitation.email.toLowerCase().includes(searchInvitationQuery.toLowerCase())
    );
    setFilteredInvitations(filtered);
  }, [searchInvitationQuery, invitations]);


  // 🔥 Déplace cette fonction en haut
  useEffect(() => {
    fetchEmployees();
    fetchInvitations(); // 🔥 Appel direct ici pour charger toutes les invitations
  }, []);


  // 🔥 Déclare cette fonction en dehors du useEffect
  const fetchInvitations = async () => {
    try {
      const response = await axios.get(`${URL}/api/invitations/all?dsp_code=${user?.dsp_code}`);
      setInvitations(response.data.invitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };




  const handleSendInvite = async () => {
    if (!inviteEmail.includes('@')) {
      Alert.alert(
        user?.language === 'English' ? 'Invalid Email' : 'Email invalide',
        user?.language === 'English'
          ? 'Please enter a valid email address.'
          : 'Veuillez entrer une adresse email valide.'
      );

      window.alert(
        user?.language === 'English'
          ? 'Please enter a valid email address.'
          : 'Veuillez entrer une adresse email valide.'
      );

      return;
    }


    try {
      await axios.post(`${URL}/api/invitations/createEmail`, {
        dsp_code: user?.dsp_code,
        email: inviteEmail
      });

      setInviteEmail('');
      setInviteModalVisible(false);
      fetchInvitations()
    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'Failed to send the invitation. Please try again.'
          : 'Échec de l’envoi de l’invitation. Veuillez réessayer.'
      );

      window.alert(
        user?.language === 'English'
          ? 'Failed to send the invitation. Please try again.'
          : 'Échec de l’envoi de l’invitation. Veuillez réessayer.'
      );
    }
  };
  // 🔥 Mettre à jour cette fonction
  const checkEmailExists = (email: string) => {
    // Vérifie si l'email existe parmi les employés
    const emailExistsInEmployees = employees.some(emp => emp.email.toLowerCase() === email.toLowerCase());

    // Vérifie si l'email a déjà été utilisé dans les invitations
    const emailExistsInInvitations = invitations.some(inv => inv.email.toLowerCase() === email.toLowerCase());

    // Si l'email existe dans au moins l'un des deux tableaux, on met `isEmailUsed` à true
    setIsEmailUsed(emailExistsInEmployees || emailExistsInInvitations);
  };


  // 🔥 Fonction pour supprimer une invitation
  const handleDeleteInvitation = async (invitationId: string) => {
    // ✅ Pour Mobile
    if (Platform.OS !== 'web') {
      Alert.alert(
        user?.language === 'English' ? 'Delete Confirmation' : 'Confirmation de suppression',
        user?.language === 'English'
          ? 'Are you sure you want to delete this invitation?'
          : 'Êtes-vous sûr de vouloir supprimer cette invitation ?',
        [
          {
            text: user?.language === 'English' ? 'Cancel' : 'Annuler',
            style: 'cancel',
          },
          {
            text: user?.language === 'English' ? 'Delete' : 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              try {
                await axios.delete(`${URL}/api/invitations/delete/${invitationId}?dsp_code=${user?.dsp_code}`);
                // 🔥 Supprimer l'invitation de la liste
                setInvitations(prevInvitations =>
                  prevInvitations.filter(inv => inv._id !== invitationId)
                );
                Alert.alert(
                  user?.language === 'English' ? 'Deleted' : 'Supprimé',
                  user?.language === 'English'
                    ? 'Invitation has been deleted.'
                    : 'L\'invitation a été supprimée.'
                );
              } catch (error) {
                console.error('Error deleting invitation:', error);

              }
            },
          },
        ],
        { cancelable: true }
      );
    } else {
      // ✅ Pour Web
      const isConfirmed = window.confirm(
        user?.language === 'English'
          ? 'Are you sure you want to delete this invitation?'
          : 'Êtes-vous sûr de vouloir supprimer cette invitation ?'
      );

      if (isConfirmed) {
        try {
          await axios.delete(`${URL}/api/invitations/delete/${invitationId}?dsp_code=${user?.dsp_code}`);
          // 🔥 Supprimer l'invitation de la liste
          setInvitations(prevInvitations =>
            prevInvitations.filter(inv => inv._id !== invitationId)
          );
        } catch (error) {
          console.error('Error deleting invitation:', error);

        }
      }
    }
  };


  const fetchEmployees = async () => {
    setLoading(true); // Début du chargement
    try {
      const response = await axios.get(`${URL}/api/employee`, {
        params: { dsp_code: user?.dsp_code },
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
          { ...updatedEmployee, dsp_code: user?.dsp_code }
        );
        const updatedList = employees.map(emp =>
          emp._id === response.data._id ? response.data : emp
        );
        setEmployees(updatedList);
        setFilteredEmployees(updatedList);
        setModalVisible(false);
        Alert.alert(
          user?.language === 'English' ? 'Success' : 'Succès',
          user?.language === 'English'
            ? 'Employee information updated'
            : 'Informations de l\'employé mises à jour'
        );

        window.alert(
          user?.language === 'English'
            ? 'Employee information updated'
            : 'Informations de l\'employé mises à jour'
        );
      } catch (error) {
        console.error('Error updating employee:', error);
      }
    }
  };


  const handleDeleteEmployee = async (id: string) => {
    const confirmationMessage =
      user?.language === 'English'
        ? 'Are you sure you want to delete this employee?'
        : 'Êtes-vous sûr de vouloir supprimer cet employé ?';

    const cancelButtonText =
      user?.language === 'English' ? 'Cancel' : 'Annuler';

    const deleteButtonText =
      user?.language === 'English' ? 'Delete' : 'Supprimer';

    if (Platform.OS === 'web') {
      // Utiliser un simple prompt pour la confirmation sur le web
      const isConfirmed = window.confirm(confirmationMessage);
      if (isConfirmed) {
        try {
          await axios.delete(`${URL}/api/employee/profile/${id}`, {
            data: { dsp_code: user?.dsp_code },
          });
          const updatedList = employees.filter(emp => emp._id !== id);
          setEmployees(updatedList);
          setFilteredEmployees(updatedList);
          setModalVisible(false);
          Alert.alert('Success', 'Employee deleted');
        } catch (error) {
          console.error('Error deleting employee:', error);
        }
      }
    } else {
      // Utiliser Alert.alert pour la confirmation sur mobile
      Alert.alert(
        user?.language === 'English' ? 'Confirm Deletion' : 'Confirmer la suppression',
        confirmationMessage,
        [
          {
            text: cancelButtonText,
            onPress: () => console.log('Deletion cancelled'),
            style: 'cancel',
          },
          {
            text: deleteButtonText,
            onPress: async () => {
              try {
                await axios.delete(`${URL}/api/employee/profile/${id}`, {
                  data: { dsp_code: user?.dsp_code },
                });
                const updatedList = employees.filter(emp => emp._id !== id);
                setEmployees(updatedList);
                setFilteredEmployees(updatedList);
                setModalVisible(false);
                Alert.alert('Success', 'Employee deleted');
              } catch (error) {
                console.error('Error deleting employee:', error);
              }
            },
          },
        ]
      );
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
      {/* Loading indicator */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#001933" />
          <Text style={styles.loadingText}>
            {user?.language === 'English' ? 'Loading...' : 'Chargement...'}
          </Text>
        </View>
      ) : (
        <>
          {/* Add a button to refresh the employee list and a search bar */}
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchBar}
              placeholder={user?.language === 'English' ? ' 🔍 Search Employee' : ' 🔍 Rechercher un employé'}
              value={searchQuery}
              onChangeText={handleSearch}
            />
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
            style={[styles.floatingButton, { bottom: 100 }]}
            onPress={() => setInviteModalVisible(true)}
          >
            <Text style={styles.floatingButtonText}>+</Text>
          </Pressable>

          <Pressable
            style={styles.floatingButton}
            onPress={() => setViewInvitationsModalVisible(true)}
          >
            <Text style={styles.floatingButtonText}>📜</Text>
          </Pressable>


        </>
      )}

      <Modal visible={inviteModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {user?.language === 'English'
                ? 'Invite New Employee'
                : 'Inviter un nouvel employé'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder={
                user?.language === 'English'
                  ? "Enter employee's email"
                  : "Entrez l'email de l'employé"
              }
              value={inviteEmail}
              onChangeText={(text) => {
                setInviteEmail(text);
                checkEmailExists(text); // 🔥 Vérification locale de l'email
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {isEmailUsed && (
              <Text style={styles.errorText}>
                {user?.language === 'English'
                  ? 'This email is already used by an employee.'
                  : 'Cet email est déjà utilisé par un employé.'}
              </Text>
            )}


            <Pressable
              style={[styles.buttonAdd, isEmailUsed && { backgroundColor: '#ccc' }]}
              onPress={handleSendInvite}
              disabled={isEmailUsed} // 🔥 Désactiver le bouton si l'email est utilisé
            >
              <Text style={styles.buttonText}>
                {user?.language === 'English'
                  ? 'Send Invite'
                  : 'Envoyer l\'invitation'}
              </Text>
            </Pressable>


            <Pressable style={styles.buttonClose} onPress={() => setInviteModalVisible(false)}>
              <Text style={styles.buttonTextClose}>
                {user?.language === 'English'
                  ? 'Close'
                  : 'Fermer'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>


      <Modal visible={viewInvitationsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {user?.language === 'English'
                ? 'Sent Invitations'
                : 'Invitations envoyées'}
            </Text>
            <View style={styles.searchBarContainer}>
              <TextInput
                style={styles.searchBar}
                placeholder={user?.language === 'English' ? '🔍 Search by email' : '🔍 Rechercher par email'}
                value={searchInvitationQuery}
                onChangeText={text => setSearchInvitationQuery(text)}
              />
            </View>

            {invitations.length > 0 ? (
              <ScrollView style={{ maxHeight: 300, marginVertical: 10 }}>
                {filteredInvitations.map((invitation) => (
                  <View key={invitation._id} style={styles.invitationItem}>
                    <View style={styles.invitationDetails}>
                      <Text style={styles.invitationEmail}>
                        {user?.language === 'English'
                          ? 'Email: '
                          : 'Email : '}
                        {invitation.email}
                      </Text>

                      <Text style={styles.invitationDate}>
                        {user?.language === 'English'
                          ? 'Sent on: '
                          : 'Envoyé le : '}
                        {new Date(Date.parse(invitation.dateCreation)).toLocaleDateString(
                          user?.language === 'English' ? 'en-GB' : 'fr-FR', // 'en-GB' pour avoir le format dd/mm/yyyy
                          {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          }
                        )}

                      </Text>

                      <Text style={{ color: invitation.fonctionnel ? 'orange' : 'green' }}>
                        {invitation.fonctionnel
                          ? (user?.language === 'English'
                            ? 'Account not yet created'
                            : 'Compte non encore créé')
                          : (user?.language === 'English'
                            ? 'Account created successfully'
                            : 'Compte créé avec succès')
                        }
                      </Text>
                    </View>

                    {/* 🔥 Symbole de corbeille placé à droite */}
                    <TouchableOpacity onPress={() => handleDeleteInvitation(invitation._id)}>
                      <Text style={styles.trashIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={{ textAlign: 'center', marginVertical: 10 }}>
                {user?.language === 'English'
                  ? 'No invitations sent yet.'
                  : 'Aucune invitation envoyée pour le moment.'}
              </Text>
            )}

            <Pressable
              style={styles.buttonClose}
              onPress={() => setViewInvitationsModalVisible(false)}
            >
              <Text style={styles.buttonTextClose}>
                {user?.language === 'English'
                  ? 'Close'
                  : 'Fermer'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>





      {/* Modal for employee details */}
      {selectedEmployee && (
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>
              {user?.language === 'English' ? 'Employee Details' : 'Détails de l\'employé'}
            </Text>

            <TextInput
              style={styles.input}
              value={updatedEmployee?.name || ''}
              onChangeText={(text) => setUpdatedEmployee({ ...updatedEmployee!, name: text })}
              placeholder={user?.language === 'English' ? 'First Name' : 'Prénom'}
            />

            <TextInput
              style={styles.input}
              value={updatedEmployee?.familyName || ''}
              onChangeText={(text) => setUpdatedEmployee({ ...updatedEmployee!, familyName: text })}
              placeholder={user?.language === 'English' ? 'Last Name' : 'Nom de famille'}
            />

            <TextInput
              style={styles.input}
              value={updatedEmployee?.tel || ''}
              onChangeText={(text) => setUpdatedEmployee({ ...updatedEmployee!, tel: text })}
              placeholder={user?.language === 'English' ? 'Phone' : 'Téléphone'}
            />

            <TextInput
              style={styles.input}
              value={updatedEmployee?.email || ''}
              onChangeText={(text) => setUpdatedEmployee({ ...updatedEmployee!, email: text })}
              placeholder={user?.language === 'English' ? 'Email' : 'Email'}
            />

            <TextInput
              style={styles.input}
              value={updatedEmployee?.password || ''}
              onChangeText={(text) => setUpdatedEmployee({ ...updatedEmployee!, password: text })}
              placeholder={user?.language === 'English' ? 'Password' : 'Mot de passe'}
            />

            <TextInput
              style={styles.input}
              value={updatedEmployee?.Transporter_ID || ''}
              onChangeText={(text) => setUpdatedEmployee({ ...updatedEmployee!, Transporter_ID: text })}
              placeholder={user?.language === 'English' ? 'Transporter ID' : 'ID du transporteur'}
            />

            <Text style={styles.label}>
              {user?.language === 'English' ? 'Role' : 'Rôle'}
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
                  {user?.language === 'English' ? 'Update' : 'Mettre à jour'}
                </Text>

              </Pressable>
              <Pressable style={[styles.buttonModal, styles.buttonDelete]} onPress={() => handleDeleteEmployee(selectedEmployee._id)}>
                <Text style={styles.buttonText}>
                  {user?.language === 'English' ? 'Delete' : 'Supprimer'}
                </Text>

              </Pressable>
              <Pressable style={[styles.buttonModal, styles.buttonCloseUpdate]} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonTextClose}>
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

export default AllEmployees;

const styles = StyleSheet.create({
  errorText: {
    color: 'red',
    marginTop: 5,
    fontSize: 14,
  },
  invitationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between', // 🔥 Corbeille à droite
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  trashIcon: {
    fontSize: 20,
    color: 'red',
    marginLeft: 10, // 🔥 Espacement à gauche du symbole
  },
  invitationDetails: {
    flex: 1,
  },
  invitationEmail: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#001933',
  },
  invitationDate: {
    fontSize: 14,
    color: '#555',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // modalTitle: {
  //   fontSize: 20,
  //   fontWeight: 'bold',
  //   marginBottom: 20,
  //   textAlign: 'center',
  //   color: '#001933',
  // },  
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
