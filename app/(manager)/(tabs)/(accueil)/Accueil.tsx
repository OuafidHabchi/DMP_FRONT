import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
  TextInput
} from 'react-native';
import axios from 'axios';
import ImageViewer from 'react-native-image-zoom-viewer';
import AppURL from '@/components/src/URL';
import EquipmentUpdatesModal from '@/components/src/EquipmentUpdatesModal';
import { useUser } from "@/context/UserContext"; // ✅ Utilisation du UserContext



interface Employee {
  familyName: string;
  name: string;
  expoPushToken: string;
}

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

interface DailyNote {
  _id: string;
  problemDescription: string;
  problemType: string;
  employee: Employee;
  assignedVanNameForToday: string;
  today: Date;
  lu: boolean;
  photo?: string; // Ajout de la propriété photo
  time: string;
}
interface EquipmentModalState {
  visible: boolean;
  photoType: string;
}

export default function Accueil() {
  const { user, socket } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedNote, setSelectedNote] = useState<DailyNote | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isModalVisibleImage, setIsModalVisibleImage] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const blinkingAnimation = useRef(new Animated.Value(1)).current;
  const [searchQuery, setSearchQuery] = useState('');
  const [isEquipmentModalVisible, setIsEquipmentModalVisible] = useState<EquipmentModalState>({
    visible: false,
    photoType: '',
  });

  const filteredDailyNotes = dailyNotes.filter(note =>
    note.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.assignedVanNameForToday.toLowerCase().includes(searchQuery.toLowerCase())
  );



  // Animation blinking
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkingAnimation, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(blinkingAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);



  useEffect(() => {
    if (!user) return; // Ne fait rien si `user` n'est pas encore chargé

    const fetchDailyNotes = async () => {
      setLoading(true);
      try {
        const formattedDate = selectedDate.toDateString();
        const response = await axios.get<DailyNote[]>(`${AppURL}/api/dailyNotes/by-date`, {
          params: {
            date: formattedDate,
            dsp_code: user.dsp_code, // Utilisation sécurisée après vérification
          },
        });

        setDailyNotes(response.data.reverse());
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchDailyNotes();
  }, [selectedDate, user]); // 🔥 Ajoute `user` comme dépendance pour éviter des requêtes invalides

  useEffect(() => {
    if (!socket) return; // Vérifie que le socket est bien connecté

    // 🔥 Écoute les nouvelles Daily Notes en temps réel
    socket.on('newDailyNote', (newNote) => {
      setDailyNotes((prevNotes) => [newNote, ...prevNotes]); // Ajoute la nouvelle note en haut
    });

    // 🔥 Nettoyage à la fin du cycle de vie
    return () => {
      socket.off('newDailyNote');
    };
  }, [socket]);




  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const handleNoteClick = async (noteId: string) => {
    try {
      setLoadingDetails(true); // Commencez à afficher le spinner
      setIsModalVisible(true); // Affichez immédiatement le modal pour le spinner

      const response = await axios.get(`${AppURL}/api/dailyNotes/details/${noteId}`, {
        params: { dsp_code: user?.dsp_code }, // Ajout de dsp_code
      });
      const noteDetails = response.data;
      setSelectedNote(noteDetails);

      if (!noteDetails.lu) {
        await axios.patch(
          `${AppURL}/api/dailyNotes/mark-as-read`,
          { noteId },
          { params: { dsp_code: user?.dsp_code } } // Ajout de dsp_code
        );
        setDailyNotes((prevNotes) =>
          prevNotes.map((n) => (n._id === noteId ? { ...n, lu: true } : n))
        );
      }
    } catch (error) {
    } finally {
      setLoadingDetails(false); // Masquez le spinner
    }
  };


  const renderItem = ({ item }: { item: DailyNote }) => {
    return (
      <TouchableOpacity
        onPress={() => handleNoteClick(item._id)}
        style={[
          styles.noteContainer,
          item.lu && styles.viewedNote, // Appliquer le style si la note est lue
        ]}
      >
        <Animated.View style={{ opacity: item.lu ? 1 : blinkingAnimation }}>
          <View style={styles.titleContainer}>
            <Text style={styles.nameText}>
              {item.employee.name} {item.employee.familyName}
            </Text>
            {Platform.OS === "web" && (
              <Text style={styles.vanText}>{item.assignedVanNameForToday}</Text>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };





  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>
          {user?.language === 'English'
            ? 'Loading, please wait...'
            : 'Chargement, veuillez patienter...'}
        </Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={() => setIsEquipmentModalVisible({ visible: true, photoType: 'prepic' })}
          style={[styles.button, styles.preButton]}
        >
          <Text style={styles.buttonText}>
            {user?.language === 'English' ? 'Work Tools Pre' : 'Outils de Travail Avant'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setIsEquipmentModalVisible({ visible: true, photoType: 'postpic' })}
          style={[styles.button, styles.postButton]}
        >
          <Text style={styles.buttonText}>
            {user?.language === 'English' ? 'Work Tools Post' : 'Outils de Travail Après'}
          </Text>
        </TouchableOpacity>
      </View>



      <Modal visible={isEquipmentModalVisible.visible} >
        <View style={{ flex: 1 }}>
          <EquipmentUpdatesModal
            day={selectedDate.toDateString()}
            photoType={isEquipmentModalVisible.photoType}
            dspCode={user?.dsp_code}
            onClose={() => setIsEquipmentModalVisible({ visible: false, photoType: '' })}
          />
        </View>
      </Modal>


      <Text style={styles.dateText}>{selectedDate.toDateString()}</Text>

      <View style={styles.navigationContainer}>
        <Pressable onPress={() => changeDate(-1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>
            {user?.language === 'English' ? 'Previous Day' : 'Jour Précédent'}
          </Text>
        </Pressable>
        

        <View style={styles.searchContainer}>
          <TextInput
            style={Platform.OS === 'web' ? styles.searchInput : styles.searchInputMobile}
            placeholder={Platform.OS === 'web' 
              ? (user?.language === 'English' 
                  ? 'Search by name or van...' 
                  : 'Rechercher par nom ou van...')
              : '🔍'  // Affiche une loupe blanche sur mobile
            }
                        value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
          />
        </View>

        <Pressable onPress={() => changeDate(1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>
            {user?.language === 'English' ? 'Next Day' : 'Jour Suivant'}
          </Text>
        </Pressable>
      </View>


      {Platform.OS === 'web' ? (
        <ScrollView contentContainerStyle={styles.webContainer}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>
              {user?.language === 'English' ? 'Road Issues' : 'Problèmes sur la Route'}
            </Text>

            <FlatList
              data={filteredDailyNotes.filter(note => note.problemType === "road")}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
            />
          </View>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>
              {user?.language === 'English' ? 'Vehicle Issues' : 'Problèmes de Véhicule'}
            </Text>
            <FlatList
              data={filteredDailyNotes.filter(note => note.problemType === "vehicle")}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
            />
          </View>
        </ScrollView>
      ) :

        (<View style={styles.listsContainer}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>
              {user?.language === 'English' ? 'Road' : 'Route'}
            </Text>
            <FlatList
              data={filteredDailyNotes.filter(note => note.problemType === "road")}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
            />
          </View>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>
              {user?.language === 'English' ? 'Vehicle' : 'Véhicule'}
            </Text>
            <FlatList
              data={filteredDailyNotes.filter(note => note.problemType === "vehicle")}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
            />

          </View>
        </View>
        )}



      <Modal visible={isModalVisible} transparent animationType="none">
        <View style={styles.enhancedModalContainer}>
          <View style={styles.enhancedModalContent}>
            {loadingDetails ? (
              // Affichage du spinner pendant le chargement
              <ActivityIndicator size="large" color="#001933" style={styles.loadingIndicatorSpinner} />
            ) : (
              <>
                <Text style={styles.enhancedModalTitle}>
                  {selectedNote?.assignedVanNameForToday || 'Note Details'}
                </Text>

                <Text style={styles.imagePreviewText}>Time :{selectedNote?.time}</Text>

                <Text style={styles.enhancedModalDescription}>
                  {selectedNote?.problemDescription || 'No description available.'}
                </Text>
                {selectedNote?.photo && (
                  <Pressable
                    onPress={() => setIsModalVisibleImage(true)}
                    style={styles.imagePreviewContainer}
                  >
                    <Text style={styles.imagePreviewText}>
                      {user?.language === 'English' ? 'View Image' : 'Voir l\'Image'}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.enhancedCloseButton}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.enhancedCloseButtonText}>
                    {user?.language === 'English' ? 'Close' : 'Fermer'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {selectedNote?.photo && (
          <Modal visible={isModalVisibleImage} transparent animationType="fade">
            <ImageViewer
              imageUrls={[{ url: selectedNote.photo ? `${AppURL}/${selectedNote.photo}` : '' }]}
              enableSwipeDown={true}
              onSwipeDown={() => setIsModalVisibleImage(false)}
              renderHeader={() => (
                <Pressable
                  style={styles.closeButtonImage}
                  onPress={() => setIsModalVisibleImage(false)}
                >
                  <Text style={styles.closeButtonTextImage}>
                    {user?.language === 'English' ? 'Close' : 'Fermer'}
                  </Text>
                </Pressable>
              )}
            />
          </Modal>
        )}
      </Modal>




    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  searchInput: {
    width: '60%',
    padding: 8,
    backgroundColor: '#ffff',
    borderRadius: 10,
    color: '#001933',
  },
  searchInputMobile: {
    width: '100%',
    padding: 8,
    backgroundColor: '#001933',
    borderRadius: 10,
    color: '#fff',  // 🔥 La loupe sera blanche
    fontSize: 20,  // 🔥 Augmente la taille de la loupe
    textAlign: 'center',  // 🔥 Centre la loupe dans l'input
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  preButton: {
    backgroundColor: '#ffffff',
  },
  postButton: {
    backgroundColor: '#ffffff',
  },
  buttonText: {
    color: '#001933',
    fontWeight: 'bold',
    fontSize: 16,
  },


  loadingIndicatorSpinner: {
    marginVertical: 20,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#001933',
  },
  welcomeContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginTop: 30,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001933',
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#001933', // Une teinte bleue plus vive
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 10, // Un peu d'espacement sous le spinner
  },
  webContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  listsContainer: {
    flex: 1, // 🔥 Ajouté pour utiliser toute la hauteur
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 0, // 🔥 Réduction du padding
    margin: 0, // 🔥 Réduction du margin
  },
  column: {
    flex: 1,
    paddingHorizontal: 7,
    maxWidth: '85%',
    paddingVertical: 0, // 🔥 Ajustement pour enlever l'espace en haut/bas
  }
  ,
  columnTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  noteContainer: {
    marginBottom: 8,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  viewedNote: {
    backgroundColor: '#a9a9a9',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#001933',
  },
  vanText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#001933',
  },
  descriptionText: {
    fontSize: 16,
    color: '#333333',
    marginTop: 4,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  navButtonText: {
    color: '#001933',
    fontWeight: 'bold',
  },
  enhancedModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Un fond transparent avec un effet de flou
  },
  enhancedModalContent: {
    width: '85%',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // Pour les ombres sur Android
  },
  enhancedModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#001933',
    marginBottom: 15,
    textAlign: 'center',
  },
  enhancedModalDescription: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  imagePreviewContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  imagePreview: {
    width: 150,
    height: 150,
    borderRadius: 10,
    marginBottom: 5,
  },
  imagePreviewText: {
    fontSize: 14,
    color: '#001933',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  enhancedCloseButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#001933',
    borderRadius: 10,
    alignItems: 'center',
  },
  enhancedCloseButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButtonImage: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 50,
  },
  closeButtonTextImage: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },


});
