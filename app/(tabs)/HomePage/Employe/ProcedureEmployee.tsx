import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Modal, ActivityIndicator, Animated, Linking, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import AppURL from '@/components/src/URL';

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

type Procedure = {
    _id: string;
    name: string;
    content: string;
    link?: string;
    date: string;
    createdBy: string;
    seen: string[];
};

const ProcedureEmployee = () => {
    const route = useRoute();
    const { user } = route.params as { user: User };
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Animation ref
    const blinkingAnim = useRef(new Animated.Value(1)).current;

    // Démarrer l'animation de clignotement
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(blinkingAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(blinkingAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    useEffect(() => {
        const fetchProcedures = async () => {
            try {
                const response = await axios.get<Procedure[]>(`${AppURL}/api/procedure?dsp_code=${user.dsp_code}`);
                setProcedures(response.data);
            } catch (err) {
                console.error('Error fetching procedures:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProcedures();
    }, []);

    const handleProcedureClick = async (procedure: Procedure) => {
        try {
            if (!procedure.seen.includes(user._id)) {
                await axios.put(`${AppURL}/api/procedure/${procedure._id}/seen?dsp_code=${user.dsp_code}`, { userId: user._id });
                setProcedures(prev =>
                    prev.map(proc => (proc._id === procedure._id ? { ...proc, seen: [...proc.seen, user._id] } : proc))
                );
            }
            setSelectedProcedure(procedure);
            setModalVisible(true);
        } catch (err) {
            console.error('Error adding user to seen list:', err);
        }
    };

    const handleRefresh = async () => {
        setIsLoading(true); // Démarre le chargement
        try {
            const response = await axios.get<Procedure[]>(`${AppURL}/api/procedure?dsp_code=${user.dsp_code}`); // Requête pour récupérer les procédures
            setProcedures(response.data); // Met à jour la liste
        } catch (err) {
            console.error('Error refreshing procedures:', err);
        } finally {
            setIsLoading(false); // Arrête le chargement
        }
    };


    const renderItem = ({ item }: { item: Procedure }) => {
        const isSeen = item.seen.includes(user._id);

        return (
            <TouchableOpacity
                style={styles.procedureCard}
                onPress={() => handleProcedureClick(item)}
            >
                <Animated.View
                    style={[
                        styles.procedureInfo,
                        !isSeen && { opacity: blinkingAnim },
                    ]}
                >
                    <Text style={styles.procedureName}>{item.name}</Text>
                    <Text style={styles.procedureDate}>{item.date.split('T')[0]}</Text>
                </Animated.View>
                <FontAwesome
                    name={isSeen ? 'eye' : 'eye-slash'}
                    size={24}
                    color={isSeen ? '#28a745' : '#dc3545'}
                    style={styles.eyeIcon}
                />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {isLoading ? (
                <ActivityIndicator size="large" color="#001933" />
            ) : (
                <FlatList
                    data={procedures}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    refreshing={isLoading} // Indique si une opération de rafraîchissement est en cours
                    onRefresh={handleRefresh} // Appelle la fonction de rafraîchissement lorsque l'utilisateur glisse vers le bas
                />

            )}

            {/* Modal pour afficher les détails */}
            <Modal visible={modalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {/* Header du modal */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{selectedProcedure?.name}</Text>
                        </View>

                        {/* Contenu défilable */}
                        <ScrollView style={styles.scrollContainer}>
                            <Text style={styles.modalText}>{selectedProcedure?.content}</Text>
                        </ScrollView>

                        {/* Lien vers plus de détails */}
                        {selectedProcedure?.link && selectedProcedure.link !== '' && (
                            <TouchableOpacity
                                onPress={() => Linking.openURL(selectedProcedure.link!)}
                                style={styles.linkButton}
                            >
                                <Text style={styles.modalLink}>
                                    {user.language === 'English' ? 'For more details, click here' : 'Pour plus de détails, cliquez ici'}
                                </Text>

                                <FontAwesome name="external-link" size={16} color="#001933" />
                            </TouchableOpacity>
                        )}

                        {/* Bouton pour fermer */}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>
                                {user.language === 'English' ? 'Close' : 'Fermer'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
};

export default ProcedureEmployee;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        padding: 20,
    },
    procedureCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    procedureInfo: {
        flex: 1,
    },
    procedureName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    procedureDate: {
        fontSize: 14,
        color: '#666',
    },
    eyeIcon: {
        marginLeft: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Background semi-transparent
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#fff',
        width: '90%',
        borderRadius: 15,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10, // For Android shadow
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    scrollContainer: {
        maxHeight: 300, // Limite la hauteur de la zone défilable
        marginBottom: 15, // Espacement entre le contenu et les boutons
    },
    modalText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#555',
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
    closeButton: {
        backgroundColor: '#001933',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
