import React, { useEffect, useState } from 'react';
import { FlatList, View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Platform, Pressable, RefreshControl, Modal } from 'react-native';
import axios from 'axios';
import AppURL from '@/components/src/URL';
import { router, useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { getSocket, disconnectSocket } from '@/components/src/socket';


interface Message {
  content: string;
  sender: string;
}

interface Conversation {
  name: string;
  _id: string;
  participants: string[];
  isGroup: boolean;
}

type User = {
  _id: string;
  name: string;
  familyName: string;
  tel: string;
  email: string;
  password: string;
  role: string;
  conversation: string;
  expoPushToken: string;
  language: string;
  dsp_code: string;
};

export default function Messenger() {
  const { user, socket } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
  const route = useRouter();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [recipients, setRecipients] = useState<Record<string, string>>({});
  const [isModalVisible, setModalVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [unreadMessagesCounts, setUnreadMessagesCounts] = useState<Record<string, number>>({});
  const [unreadConversations, setUnreadConversations] = useState<Record<string, boolean>>({});
  const [isManageModalVisible, setManageModalVisible] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Ajouter cet état en haut du composant :
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');

  // Filtrer les employés en fonction du terme de recherche
  const filteredEmployees = employees.filter((emp) =>
    `${emp.name} ${emp.familyName}`.toLowerCase().includes(searchEmployeeQuery.toLowerCase())
  );


  const filteredConversations = conversations.filter((conversation) => {
    const recipientName = recipients[conversation._id];

    // Vérifie que recipientName et conversation.name sont bien des chaînes avant d'appeler toLowerCase()
    const hasRecipientName = typeof recipientName === 'string' && recipientName.toLowerCase().includes(searchQuery.toLowerCase());
    const hasGroupName = conversation.isGroup && typeof conversation.name === 'string' && conversation.name.toLowerCase().includes(searchQuery.toLowerCase());

    return hasRecipientName || hasGroupName;
  });




  useEffect(() => {
    if (!socket) return;
    // Si la conversation n'existe pas, rafraîchis la liste
    fetchConversations();
    // Écoute les nouveaux messages
    socket.on('newMessage', (messageData) => {
      setConversations((prevConversations) => {
        // Vérifie si la conversation existe déjà
        const existingConversation = prevConversations.find(conv => conv._id === messageData.conversationId);

        if (existingConversation) {
          return prevConversations.map(conv =>
            conv._id === messageData.conversationId
              ? { ...conv, lastMessage: messageData.content }
              : conv
          );
        } else {

          return prevConversations;
        }
      });
    });

    // Nettoyage à la fin du cycle de vie
    return () => {
      socket.off('newMessage');
    };
  }, [socket]);




  const openAddParticipantsModal = async (conversation: Conversation) => {

    try {
      // Charger les employés disponibles
      const response = await axios.get(`${AppURL}/api/employee?dsp_code=${user?.dsp_code}`);
      const filteredEmployees = response.data.filter((emp: User) => !conversation.participants.includes(emp._id));
      setEmployees(filteredEmployees); // Met à jour les employés disponibles
      setSelectedConversation(conversation);
      setManageModalVisible(true); // Ouvre la modalité
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const addParticipantsToConversation = async () => {
    if (!selectedConversation) return;

    try {
      const response = await axios.patch(
        `${AppURL}/api/conversations/conversations/${selectedConversation._id}/participants?dsp_code=${user?.dsp_code}`,
        { newParticipants: selectedEmployees }
      );

      // Mettre à jour la liste des conversations localement
      setConversations((prevConversations) =>
        prevConversations.map(conv =>
          conv._id === selectedConversation._id ? response.data.conversation : conv
        )
      );

      // Réinitialiser les états
      setSelectedEmployees([]);
      setManageModalVisible(false);
    } catch (error) {
      console.error('Error adding participants:', error);
    }
  };






  const fetchConversations = async () => {
    setRefreshing(true);
    try {
      const response = await axios.get(`${AppURL}/api/conversations/conversations/${user?._id}?dsp_code=${user?.dsp_code}`);
      const conversationsData = response.data;
      setConversations(conversationsData);

      const recipientNames: Record<string, string> = {};
      let hasUnread = false;

      await Promise.all(
        conversationsData.map(async (conversation: Conversation) => {
          if (conversation.isGroup) {
            recipientNames[conversation._id] = conversation.name || 'Unnamed Group';
          } else {
            const recipientId = conversation.participants.find((id) => id !== user?._id);
            if (recipientId) {
              const recipient = await fetchUserById(recipientId);
              recipientNames[conversation._id] = recipient ? `${recipient.name} ${recipient.familyName}` : 'Unknown';
            }
          }
        })
      );
      setRecipients(recipientNames);

      // Récupérer le statut des messages non lus
      const unreadStatusResponse = await axios.get(`${AppURL}/api/conversations/conversations/unreadStatus/${user?._id}?dsp_code=${user?.dsp_code}`);
      setUnreadConversations(unreadStatusResponse.data);

      // Déterminer s'il existe des messages non lus
      hasUnread = Object.values(unreadStatusResponse.data).some((status) => status === true);
      // onUnreadStatusChange(hasUnread); // Mise à jour de l'état global pour le badge

    } catch (error) {
      console.error('Error fetching conversations', error);
    } finally {
      setRefreshing(false);
    }
  };






  const fetchUserById = async (userId: string): Promise<User | null> => {
    try {
      const response = await axios.get(`${AppURL}/api/employee/profile/${userId}?dsp_code=${user?.dsp_code}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user details', error);
      return null;
    }
  };

  const openNewConversation = async () => {
    try {
      const response = await axios.get(`${AppURL}/api/employee?dsp_code=${user?.dsp_code}`);

      // Filtrer les employés selon le rôle de l'utilisateur
      const filteredEmployees = response.data.filter((emp: User) => {
        // Si l'utilisateur n'est pas un driver, afficher tous les employés
        if (user?.role !== 'driver') {
          return emp._id !== user?._id; // Exclure uniquement lui-même
        }
        // Sinon, exclure les employés avec un rôle de driver
        return emp._id !== user?._id && emp.role !== 'driver';
      });

      setEmployees(filteredEmployees);
      setModalVisible(true);
    } catch (error) {
      console.error('Error fetching employees', error);
    }
  };


  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees((prevSelected) =>
      prevSelected.includes(employeeId)
        ? prevSelected.filter(id => id !== employeeId) // Supprime l'utilisateur s'il est déjà sélectionné
        : [...prevSelected, employeeId] // Ajoute l'utilisateur s'il n'est pas sélectionné
    );
  };
  const toggleSelectAllEmployees = (isSelectAll: boolean) => {
    if (isSelectAll) {
      // Select all employees
      setSelectedEmployees(employees.map(emp => emp._id));
    } else {
      // Deselect all employees
      setSelectedEmployees([]);
    }
  };


  const createConversation = async () => {
    try {
      // 🔹 Vérifier si `user` et ses données sont bien définis
      if (!user?._id || !user?.dsp_code) {
        console.error("User ID or DSP code is missing.");
        return;
      }

      // 🔹 Vérifier qu'au moins un participant est sélectionné
      if (selectedEmployees.length === 0) {
        console.error("No participants selected.");
        return;
      }

      // 🔹 Ajouter l'utilisateur actuel aux participants
      const participants: string[] = [user._id, ...selectedEmployees];
      const isGroup = participants.length > 2;

      // 🔹 Vérifier si une conversation 1-1 existe déjà
      const existingConversation = !isGroup && conversations.find(conversation =>
        participants.every(participant => conversation.participants.includes(participant)) &&
        conversation.participants.length === participants.length
      );

      if (existingConversation) {
        // ✅ Si la conversation existe déjà, on redirige immédiatement
        router.push({
          pathname: '/Chat',
          params: {
            conversationId: existingConversation._id,
            participantIds: JSON.stringify(participants),
          },
        });

      } else {
        // ✅ Sinon, créer une nouvelle conversation
        const conversationData = {
          participants,
          isGroup,
          name: isGroup ? groupName : '',
        };

        const response = await axios.post(
          `${AppURL}/api/conversations/conversations?dsp_code=${user.dsp_code}`,
          conversationData
        );

        // 🔹 Rafraîchir la liste des conversations
        await fetchConversations();

        // ✅ Redirection vers la nouvelle conversation
        router.push({
          pathname: '/Chat',
          params: {
            conversationId: response.data._id,
            participantIds: JSON.stringify(participants),
          },
        });
      }

      // 🔹 Réinitialiser les états
      setModalVisible(false);
      setSelectedEmployees([]);
      setGroupName('');

    } catch (error) {
      console.error('Error creating or fetching conversation', error);
    }
  };


  const deleteConversation = async (conversationId: string) => {
    try {
      await axios.delete(`${AppURL}/api/conversations/conversations/${conversationId}?dsp_code=${user?.dsp_code}`);
      await fetchConversations();
      setDeleteModalVisible(false);
    } catch (error) {
      console.error('Error deleting conversation', error);
    }
  };

  const openConversation = async (conversation: Conversation) => {
    try {
      // 🔹 Vérifier que `user` est bien défini
      if (!user) {
        console.error("User is null, cannot proceed.");
        return;
      }

      // 🔹 Marquer les messages comme lus dans le backend
      await axios.post(`${AppURL}/api/messages/messages/markAsRead?dsp_code=${user.dsp_code}`, {
        conversationId: conversation._id,
        userId: user._id,
      });

      // 🔹 Récupérer les IDs des participants
      const recipientIds = conversation.participants.filter(id => id !== user._id);

      // 🔹 Naviguer vers l'écran de chat en ne passant que l'essentiel
      router.push({
        pathname: '/Chat',
        params: {
          conversationId: conversation._id,
          participantIds: JSON.stringify(recipientIds),
        },
      });

      // 🔹 Mise à jour des conversations non lues
      setUnreadConversations((prev) => ({
        ...prev,
        [conversation._id]: false,
      }));

    } catch (error) {
      console.error('Error opening conversation', error);
    }
  };


  const openDeleteConversationModal = () => {
    setDeleteModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>

        <TextInput
          style={styles.searchBar}
          placeholder={user?.language === "English" ? "🔍 Search conversations..." : "🔍 Rechercher une conversation..."}
          placeholderTextColor="#aaa"
          value={searchQuery}
          onChangeText={(text) => setSearchQuery(text)}
        />
      </View>

      <FlatList
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchConversations} />
        }
        data={filteredConversations}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => openConversation(item)}
            style={styles.conversationItem}
          >
            {/* Text, Badge, and Manage button in the same row */}
            <View style={styles.conversationRow}>
              <Text style={styles.conversationText}>
                {recipients[item._id] || (user?.language === 'English' ? 'Loading...' : 'Chargement...')}
              </Text>

              {/* Badge and Manage button container */}
              <View style={styles.buttonBadgeContainer}>
                {unreadConversations[item._id] && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {user?.language === 'English' ? 'New' : 'Nouveau'}
                    </Text>
                  </View>
                )}

                {/* Only show the Manage button if the user's role is not "driver" */}
                {user?.role !== "driver" && item.isGroup && (
                  <TouchableOpacity
                    onPress={() => openAddParticipantsModal(item)}
                    style={styles.manageButton}
                  >
                    <Text style={styles.manageButtonText}>
                      {user?.language === 'English' ? 'Manage' : 'Gérer'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item._id}
      />



      <TouchableOpacity onPress={openNewConversation} style={styles.addButton}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      {user?.role !== "driver" && (
        <TouchableOpacity onPress={openDeleteConversationModal} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>-</Text>
        </TouchableOpacity>
      )}


      <Modal visible={isDeleteModalVisible} animationType="slide" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {user?.language === 'English' ? 'Select a Conversation to Delete' : 'Sélectionnez une Conversation à Supprimer'}
          </Text>
          <FlatList
            data={conversations}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => deleteConversation(item._id)} style={styles.employeeItem}>
                <Text>{recipients[item._id] || 'Unknown'}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item._id}
          />
          <Button
            title={user?.language === 'English' ? 'Close' : 'Fermer'}
            onPress={() => setDeleteModalVisible(false)}
            color="#001933"
          />
        </View>
      </Modal>

      <Modal visible={isModalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {user?.language === 'English' ? 'Create Group Conversation' : 'Créer une Conversation de Groupe'}
          </Text>

          {/* 🔎 Barre de recherche pour filtrer les employés */}
          <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchBar}
            placeholder={user?.language === 'English' ? '🔍 Search Employee...' : '🔍 Rechercher un Employé...'}
            placeholderTextColor="#aaa"
            value={searchEmployeeQuery}
            onChangeText={setSearchEmployeeQuery}
          />
          </View>

          {selectedEmployees.length > 1 && (
            <TextInput
              style={styles.input}
              placeholder={user?.language === 'English' ? 'Enter Group Name' : 'Entrez le Nom du Groupe'}
              placeholderTextColor="#888"
              value={groupName}
              onChangeText={setGroupName}
            />
          )}
          {/* Select All / Deselect All Buttons */}
          <View style={styles.selectAllContainer}>
            <TouchableOpacity
              onPress={() => toggleSelectAllEmployees(true)} // Select all
              style={styles.selectAllButton}
            >
              <Text style={styles.selectAllButtonText}>
                {user?.language === 'English' ? 'Select All' : 'Tout Sélectionner'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleSelectAllEmployees(false)} // Deselect all
              style={styles.deselectAllButton}
            >
              <Text style={styles.deselectAllButtonText}>
                {user?.language === 'English' ? 'Deselect All' : 'Désélectionner Tout'}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredEmployees}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => toggleEmployeeSelection(item._id)} style={styles.employeeItem}>
                <Text>{item.name} {item.familyName}</Text>
                {selectedEmployees.includes(item._id) && <Text>✓</Text>}
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item._id}
          />
          <View style={styles.createModalButtonContainer}>
            <TouchableOpacity
              onPress={createConversation}
              disabled={selectedEmployees.length === 0}
              style={[
                styles.createModalAddButton,
                selectedEmployees.length === 0 && styles.createModalDisabledButton,
              ]}
            >
              <Text style={styles.createModalAddButtonText}>
                {user?.language === 'English' ? 'Create Conversation' : 'Créer une Conversation'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.createModalCloseButton}
            >
              <Text style={styles.createModalCloseButtonText}>
                {user?.language === 'English' ? 'Close' : 'Fermer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      <Modal
        visible={isManageModalVisible}
        animationType="slide"
        onRequestClose={() => setManageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {user?.language === 'English' ? 'Add Participants' : 'Ajouter des Participants'}
          </Text>

          {/* Select All / Deselect All Buttons */}
          <View style={styles.selectAllContainer}>
            <TouchableOpacity
              onPress={() => toggleSelectAllEmployees(true)} // Select all
              style={styles.selectAllButton}
            >
              <Text style={styles.selectAllButtonText}>
                {user?.language === 'English' ? 'Select All' : 'Tout Sélectionner'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleSelectAllEmployees(false)} // Deselect all
              style={styles.deselectAllButton}
            >
              <Text style={styles.deselectAllButtonText}>
                {user?.language === 'English' ? 'Deselect All' : 'Désélectionner Tout'}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={employees.filter(emp => !selectedConversation?.participants.includes(emp._id))}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => toggleEmployeeSelection(item._id)}
                style={styles.employeeItem}
              >
                <Text>{item.name} {item.familyName}</Text>
                {selectedEmployees.includes(item._id) && <Text>✓</Text>}
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item._id}
          />

          <View style={styles.manageModalButtonContainer}>
            <TouchableOpacity
              onPress={addParticipantsToConversation}
              disabled={selectedEmployees.length === 0}
              style={[
                styles.manageModalAddButton,
                selectedEmployees.length === 0 && styles.manageModalDisabledButton,
              ]}
            >
              <Text style={styles.manageModalAddButtonText}>
                {user?.language === 'English' ? 'Add Participants' : 'Ajouter des Participants'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setManageModalVisible(false)}
              style={styles.manageModalCloseButton}
            >
              <Text style={styles.manageModalCloseButtonText}>
                {user?.language === 'English' ? 'Close' : 'Fermer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


    </View>
  );
}

const styles = StyleSheet.create({
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
  selectAllContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  selectAllButton: {
    backgroundColor: '#001933',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },

  selectAllButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  deselectAllButton: {
    backgroundColor: '#d3d3d3',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },

  deselectAllButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  createModalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Espacement entre les boutons
    marginTop: 20,
  },

  createModalAddButton: {
    backgroundColor: '#001933', // Couleur de fond pour "Create Conversation"
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },

  createModalDisabledButton: {
    backgroundColor: '#808080', // Couleur de fond désactivée
  },

  createModalAddButtonText: {
    color: '#fff', // Couleur du texte
    fontSize: 16,
    fontWeight: 'bold',
  },

  createModalCloseButton: {
    backgroundColor: '#d3d3d3', // Couleur de fond grise pour "Close"
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },

  createModalCloseButtonText: {
    color: '#333', // Couleur du texte pour "Close"
    fontSize: 16,
    fontWeight: 'bold',
  },
  manageModalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Espacement entre les boutons
    marginTop: 20,
  },

  manageModalAddButton: {
    backgroundColor: '#001933', // Couleur de fond pour "Add Participants"
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },

  manageModalDisabledButton: {
    backgroundColor: '#808080', // Couleur de fond désactivée
  },

  manageModalAddButtonText: {
    color: '#fff', // Couleur du texte
    fontSize: 16,
    fontWeight: 'bold',
  },

  manageModalCloseButton: {
    backgroundColor: '#d3d3d3', // Couleur de fond grise pour "Close"
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },

  manageModalCloseButtonText: {
    color: '#333', // Couleur du texte pour "Close"
    fontSize: 16,
    fontWeight: 'bold',
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '95%',
  },
  buttonBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center', // Align vertically
    justifyContent: 'flex-end', // Align to the right
  },
  unreadBadge: {
    backgroundColor: 'red',
    borderRadius: 8,
    paddingVertical: 2, // Adjust for height consistency
    paddingHorizontal: 6,
    marginRight: 10, // Space between badge and button
  },
  unreadBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  manageButton: {
    backgroundColor: '#001933',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  container: { flex: 1, padding: 20, backgroundColor: '#001933' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#fff', marginTop: 50 },
  conversationItem: { padding: 15, backgroundColor: '#e6e6e6', borderRadius: 8, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  conversationText: { fontSize: 16, color: '#001933' },
  addButton: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, backgroundColor: '#fff', borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  addButtonText: { color: '#001933', fontSize: 36, fontWeight: 'bold' },
  deleteButton: { position: 'absolute', bottom: 100, right: 30, width: 60, height: 60, backgroundColor: '#fff', borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  deleteButtonText: { color: '#ff0000', fontSize: 36, fontWeight: 'bold' },
  modalContainer: { flex: 1, padding: 20, backgroundColor: '#fff' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#001933' },
  employeeItem: { padding: 15, backgroundColor: '#f9f9f9', borderRadius: 8, marginBottom: 10, borderColor: '#ccc', borderWidth: 1 },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 15, paddingHorizontal: 10 },
  refreshButton: { backgroundColor: '#f9f9f9', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  refreshButtonText: { color: '#001933', fontSize: 16, fontWeight: 'bold' },
});
