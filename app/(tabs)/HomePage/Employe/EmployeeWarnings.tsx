import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  Animated,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { Image } from 'react-native'; // Pour afficher l'aperçu de l'image
import ImageViewer from 'react-native-image-zoom-viewer';
import AppURL from '@/components/src/URL';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

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
  language: string,
  dsp_code: string,
};


type Warning = {
  _id: string;
  raison: string;
  description: string;
  date: string;
  severity: 'low' | 'medium' | 'high'; // Ajout de la sévérité
  type: 'warning' | 'suspension';
  read: boolean;
  signature: boolean;
  photo: '';
  link?: string;
  susNombre?: string;
};

const EmployeeWarnings = () => {
  const route = useRoute();
  const { user } = route.params as { user: User };
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [selectedWarning, setSelectedWarning] = useState<Warning | null>(null);
  const [refreshing, setRefreshing] = useState(false); // For pull-to-refresh
  const [blinkAnim] = useState(new Animated.Value(1));
  const [loading, setLoading] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1)); // Valeur d'animation pour l'effet "pulse"


  useEffect(() => {
    // Animation infinie de pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);


  const openImageInFullScreen = () => {
    setIsImageModalVisible(true);
  };

  const closeImageInFullScreen = () => {
    setIsImageModalVisible(false);
  };


  const fetchWarnings = async () => {
    try {
      const response = await axios.get(`${AppURL}/api/warnings/wornings/employe/${user._id}?dsp_code=${user.dsp_code}`);
      setWarnings(response.data.reverse()); // Inverser pour afficher le dernier en haut
    } catch (error) {
      console.error('Failed to fetch warnings:', error);
    }
  };


  const fetchWarningDetails = async (warningId: string) => {
    try {
      setLoading(true); // Commence le chargement
      const response = await axios.get(`${AppURL}/api/warnings/wornings/${warningId}?dsp_code=${user.dsp_code}`);
      const warningData = response.data;

      // Assurez-vous que la photo est correctement attribuée
      if (warningData.photo) {
        warningData.photo = warningData.photo;
      }

      setSelectedWarning(warningData); // Met à jour le warning sélectionné
    } catch (error) {
      console.error('Error fetching warning details:', error);
      Alert.alert('Error', 'Failed to fetch warning details. Please try again later.');
    } finally {
      setLoading(false); // Termine le chargement
    }
  };



  useEffect(() => {
    fetchWarnings();
  }, [user]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, [blinkAnim]);

  const markAsRead = async (warningId: string) => {
    try {
      await axios.put(`${AppURL}/api/warnings/wornings/${warningId}?dsp_code=${user.dsp_code}`, { read: true });
      setWarnings((prevWarnings) =>
        prevWarnings.map((w) => (w._id === warningId ? { ...w, read: true } : w))
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
      Alert.alert('Error', 'Failed to mark the warning as read.');
    }
  };

  const handleSignature = async (warningId: string, signature: boolean) => {
    try {
      await axios.put(`${AppURL}/api/warnings/wornings/${warningId}?dsp_code=${user.dsp_code}`, { signature });
      setWarnings((prevWarnings) =>
        prevWarnings.map((w) => (w._id === warningId ? { ...w, signature } : w))
      );
      Alert.alert(
        user.language === 'English'
          ? 'Response submitted successfully.'
          : 'Réponse soumise avec succès.'
      );
      setSelectedWarning(null);
    } catch (error) {
      console.error('Failed to update signature:', error);
      Alert.alert(
        user.language === 'English' ? 'Error' : 'Erreur',
        user.language === 'English'
          ? 'Failed to update the warning signature.'
          : 'Échec de la mise à jour de la signature d\'avertissement.'
      );
    }
  };


  const renderWarningItem = ({ item }: { item: Warning }) => {
    const containerStyle = [
      styles.warningItem,
      item.type === 'suspension' ? styles.suspension : styles.warning,
      !item.read && { transform: [{ scale: blinkAnim }] },
    ];

    // Define severity color
    const severityColor =
      item.severity === 'high' ? '#ff4d4d' : item.severity === 'medium' ? '#ffa500' : '#4caf50';

    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={async () => {
          setLoading(true); // Commencez à charger immédiatement après le clic
          if (!item.read) await markAsRead(item._id); // Marquez comme lu si nécessaire
          await fetchWarningDetails(item._id); // Récupérez les détails
        }}
      >
        <Text style={styles.warningType}>
          {item.type === 'warning' ? 'Warning' : 'Suspension'}
        </Text>
        <Text style={styles.warningReason}>{item.raison}</Text>
        <Text style={styles.warningDate}>{item.date}</Text>

        {/* Display severity only for warnings */}
        {item.type === 'warning' && item.severity && (
          <Text style={[styles.warningSeverity, { color: severityColor }]}>
            Severity: {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
          </Text>
        )}

        {/* Signature Status at the bottom right */}
        {item.type === 'warning' && (
          <Text
            style={[
              styles.signatureStatus,
              { color: item.signature ? '#2ecc71' : '#e74c3c' }, // Green for signed, red for not signed
            ]}
          >
            {item.signature ? '✔️' : '❌'}
          </Text>
        )}
      </TouchableOpacity>
    );
  };




  const renderWarningDetails = () => {
    if (!selectedWarning && !loading) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedWarning || loading}
        onRequestClose={() => setSelectedWarning(null)}
      >
        <View style={styles.modalContainer}>
          {loading ? (
            <View style={styles.loadingWrapper}>
              <View style={styles.loadingContainer2}>
                <ActivityIndicator size="large" color="#001933" />
                <Text style={styles.loadingText2}>
                  {user.language === 'English' ? 'Loading warning details...' : 'Chargement des détails de l\'avertissement...'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Warning Type */}
                <Text
                  style={[
                    styles.modalType,
                    { color: selectedWarning?.type === 'warning' ? '#ffa500' : '#ff4d4d' },
                  ]}
                >
                  {selectedWarning?.type === 'warning' ? 'Warning' : 'Suspension'}
                </Text>

                {/* Warning Details */}
                <Text style={styles.modalReason}>{selectedWarning?.raison}</Text>

                {selectedWarning?.raison === `Scorecard rating: ${user.scoreCard}` && (
                  <Text style={styles.modalFocus}>Focus on: {user?.focusArea}</Text>
                )}

                <Text style={styles.modalLabel}>Description:</Text>
                <Text style={styles.modalDescription}>{selectedWarning?.description}</Text>


                {selectedWarning?.type === 'suspension' && (
                  <>
                    <Text style={styles.modalText}>
                      {user.language === 'English'
                        ? 'Number of Suspended Shifts: '
                        : 'Nombre de shifts suspendus: '}
                      {selectedWarning.susNombre}
                    </Text>

                  </>
                )}

                {/* Display the photo if available */}
                {selectedWarning?.photo && (
                  <View style={styles.imageContainer}>
                    <TouchableOpacity onPress={openImageInFullScreen}>
                      <Image
                        source={{ uri: selectedWarning.photo }}
                        style={styles.warningImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {selectedWarning?.link && selectedWarning.link !== '' && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(selectedWarning.link!)}
                    style={styles.linkButton}
                  >
                    <Text style={styles.modalLink}>
                      {user.language === 'English' ? 'For more details, click here' : 'Pour plus de détails, cliquez ici'}
                    </Text>

                    <FontAwesome name="external-link" size={16} color="#001933" />
                  </TouchableOpacity>
                )}
                {/* Signature Button for Warnings */}
                {selectedWarning?.type === 'warning' && !selectedWarning?.signature && (
                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={styles.buttonAccept}
                      onPress={() => handleSignature(selectedWarning._id, true)}
                    >
                      <Text style={styles.buttonText}>
                        {user.language === 'English' ? 'Sign' : 'Signer'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              {/* Close Button */}
              <TouchableOpacity
                style={styles.buttonClose}
                onPress={() => setSelectedWarning(null)}
              >
                <Text style={styles.buttonText}>
                  {user.language === 'English' ? 'Close' : 'Fermer'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    );
  };


  const onRefresh = async () => {
    setRefreshing(true); // Start the refreshing animation
    await fetchWarnings(); // Fetch updated data
    setRefreshing(false); // Stop the refreshing animation
  };

  return (
    <View style={styles.container}>
      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>
          {user.language === 'English' ? 'Warnings: ' : 'Avertissements: '}
          {warnings.filter((w) => w.type === 'warning').length}
        </Text>

        <Text style={styles.counterText}>
          {user.language === 'English' ? 'Suspensions: ' : 'Suspensions: '}
          {warnings.filter((w) => w.type === 'suspension').length}
        </Text>

      </View>

      <FlatList
        data={warnings}
        keyExtractor={(item) => item._id}
        renderItem={renderWarningItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {user.language === 'English' ? 'No warnings available.' : 'Aucun avertissement disponible.'}
          </Text>
        }
      />
      {renderWarningDetails()}
      {selectedWarning?.photo && (
        <Modal
          visible={isImageModalVisible}
          transparent={true}
          onRequestClose={closeImageInFullScreen}
        >
          <View style={styles.modalImageContainer}>
            {/* Bouton "X" pour fermer */}
            <TouchableOpacity style={styles.closeButton} onPress={closeImageInFullScreen}>
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>

            <ImageViewer
              imageUrls={[
                {
                  url: selectedWarning.photo, // L'URL de l'image
                },
              ]}
              enableSwipeDown={true} // Permet de fermer en glissant vers le bas
              onSwipeDown={closeImageInFullScreen}
            />
          </View>
        </Modal>
      )}
    </View>
  );
};

export default EmployeeWarnings;

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20, // Ajoute de l'espace pour scroller confortablement
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer2: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',

  },
  loadingText2: {
    marginTop: 10,
    fontSize: 16,
    color: '#ffff',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffff',
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  closeButton: {
    position: 'absolute',
    top: 40, // Ajuste selon la hauteur de la barre d'état
    right: 20,
    zIndex: 10, // Assure que le bouton est au-dessus de l'image
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    borderRadius: 20,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  modalImage: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },

  imageContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  warningImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  counterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#eaeaea',
    borderRadius: 10,
  },
  counterText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  warningItem: {
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fff',
    elevation: 3,
  },
  warning: {
    borderLeftWidth: 5,
    borderLeftColor: '#ffa500',
  },
  suspension: {
    borderLeftWidth: 5,
    borderLeftColor: '#ff4d4d',
  },
  warningType: {
    fontSize: 14,
    color: '#555',
  },
  warningReason: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  warningDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalType: {
    fontSize: 18,
    color: '#555',
    fontWeight: 'bold',
  },
  modalReason: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
  },
  modalFocus: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    color: "red"
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 15,
    color: '#555',
  },
  modalDescription: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
  },
  modalText: {
    padding: 10,
    fontSize: 14,
    color: '#ff4d4d',
    marginTop: 5,
    fontWeight: 'bold',

  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  modalLink: {
    fontSize: 16,
    color: '#001933',
    marginRight: 8,
    fontWeight: 'bold',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  buttonAccept: {
    padding: 10,
    backgroundColor: '#f44336',
    borderRadius: 8,
  },
  buttonClose: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#001933',
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#888',
  },
  warningSeverity: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
  },
  signatureStatus: {
    position: 'absolute',
    bottom: 8, // Distance from the bottom of the item
    right: 8,  // Distance from the right of the item
    fontSize: 16, // Adjust the size for better visibility
    fontWeight: 'bold',
  },


});
