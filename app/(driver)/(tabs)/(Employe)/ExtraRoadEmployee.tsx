import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    FlatList
} from 'react-native';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import AppURL from '@/components/src/URL';
import { useUser } from '@/context/UserContext';

type Road = {
    _id: string;
    roadNumber: number;
    startTime: string;
    date: string;
    offerName: string;
    valid: boolean;
    seen: string[];
    interested: string[];
    notInterested: string[];
};

const ExtraRoadEmployee = () => {
    const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [roads, setRoads] = useState<Road[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRoad, setSelectedRoad] = useState<Road | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    useEffect(() => {
        const fetchRoadsByDate = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get<Road[]>(
                    `${AppURL}/api/roads/bydate/get?dsp_code=${user?.dsp_code}`,
                    {
                        params: {
                            date: selectedDate.toISOString().split('T')[0],
                        },
                    }
                );

                if (response.data) {
                    setRoads(response.data.filter((road) => road.valid));
                } else {
                    setRoads([]);
                }
            } catch (err) {
                console.warn('No data available for the selected date.');
                setRoads([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRoadsByDate();
    }, [selectedDate]);

    const changeDay = (direction: 1 | -1) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + direction);
        setSelectedDate(newDate);
    };

    const openModal = async (road: Road) => {
        setSelectedRoad(road);
        setModalVisible(true);

        try {
            const updatedRoad = {
                ...road,
                seen: road.seen.includes(user?._id ?? "") ? road.seen : [...road.seen, user?._id ?? ""], // ✅ Ajout d'une valeur par défaut
            };

            setRoads((prev) =>
                prev.map((r) => (r._id === road._id ? updatedRoad : r))
            );

            await axios.put(`${AppURL}/api/roads/${road._id}?dsp_code=${user?.dsp_code ?? ""}`, {
                seen: updatedRoad.seen,
            });
        } catch (err) {
            console.error('Error updating seen list:', err);
        }
    };


    const handleInterested = async () => {
        if (selectedRoad) {
            try {
                const updatedRoad = {
                    ...selectedRoad,
                    interested: [...selectedRoad.interested, user?._id ?? ""], // ✅ Ajout de valeur par défaut
                };
    
                setRoads((prev) =>
                    prev.map((r) => (r._id === selectedRoad._id ? updatedRoad : r))
                );
    
                await axios.put(`${AppURL}/api/roads/${selectedRoad._id}?dsp_code=${user?.dsp_code ?? ""}`, {
                    interested: updatedRoad.interested,
                });
    
                alert('Marked as Interested!');
                setModalVisible(false);
            } catch (err) {
                console.error('Error updating interested list:', err);
            }
        }
    };
    

    const handleNotInterested = async () => {
        if (selectedRoad) {
            try {
                const updatedRoad = {
                    ...selectedRoad,
                    notInterested: [...selectedRoad.notInterested, user?._id ?? ""], // ✅ Ajout de valeur par défaut
                };
    
                setRoads((prev) =>
                    prev.map((r) => (r._id === selectedRoad._id ? updatedRoad : r))
                );
    
                await axios.put(`${AppURL}/api/roads/${selectedRoad._id}?dsp_code=${user?.dsp_code ?? ""}`, {
                    notInterested: updatedRoad.notInterested,
                });
    
                alert('Marked as Not Interested!');
                setModalVisible(false);
            } catch (err) {
                console.error('Error updating notInterested list:', err);
            }
        }
    };
    

    return (
        <View style={styles.container}>
            <View style={styles.dateContainer}>
                <TouchableOpacity onPress={() => changeDay(-1)} style={styles.navButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.dateText}>
                    {selectedDate.toISOString().split('T')[0]}
                </Text>
                <TouchableOpacity onPress={() => changeDay(1)} style={styles.navButton}>
                    <MaterialIcons name="arrow-forward" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>
                {user?.language === 'English'
                    ? `Routes for ${user?.name} ${user?.familyName}`
                    : `Routes pour ${user?.name} ${user?.familyName}`}
            </Text>

            {isLoading ? (
                <ActivityIndicator size="large" color="#001933" style={styles.loadingIndicator} />
            ) : roads.length > 0 ? (
                <FlatList
                    data={roads}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => {
                        const isSeen = item.seen.includes(user?._id ?? "");
                        const isInterested = item.interested.includes(user?._id ?? "");
                        const isNotInterested = item.notInterested.includes(user?._id ?? "");

                        return (
                            <TouchableOpacity onPress={() => openModal(item)}>
                                <View style={styles.roadCard}>
                                    <View style={styles.roadInfo}>
                                        <Text style={styles.roadNumber}>{item.offerName}</Text>
                                        <View style={styles.statusIcons}>
                                            <MaterialIcons
                                                name={isSeen ? 'visibility' : 'visibility-off'}
                                                size={24}
                                                color={isSeen ? 'green' : 'red'}
                                            />
                                            <MaterialIcons
                                                name={isInterested ? 'thumb-up' : 'thumb-down'}
                                                size={24}
                                                color={isInterested ? 'blue' : isNotInterested ? 'red' : 'gray'}
                                            />
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            ) : (
                <Text style={styles.emptyText}>
                    {user?.language === 'English' ? 'No routes found for this date.' : 'Aucune route trouvée pour cette date.'}
                </Text>

            )}

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>

                        <Text style={styles.modalText}>
                            {user?.language === 'English'
                                ? `Hello ${user?.name} ${user?.familyName}, we have received ${selectedRoad?.roadNumber} Routes Extras.`
                                : `Bonjour ${user?.name} ${user?.familyName}, nous avons reçu ${selectedRoad?.roadNumber} routes supplémentaires.`}
                        </Text>
                        <Text style={styles.modalText}>
                            {user?.language === 'English'
                                ? `The shift starts at ${selectedRoad?.startTime}.`
                                : `Le quart commence à ${selectedRoad?.startTime}.`}
                        </Text>

                        {!selectedRoad?.interested.includes(user?._id ?? "") &&
                            !selectedRoad?.notInterested.includes(user?._id ?? "") && (
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={styles.interestedButton}
                                        onPress={handleInterested}
                                    >
                                        <Text style={styles.buttonText}>
                                            {user?.language === 'English' ? "Yes, I'm Interested" : "Oui, je suis intéressé"}
                                        </Text>

                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.notInterestedButton}
                                        onPress={handleNotInterested}
                                    >
                                        <Text style={styles.buttonText}>
                                            {user?.language === 'English' ? "No, I'm Not Interested" : "Non, pas intéressé"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                            <Text style={styles.buttonText}>
                                {user?.language === 'English' ? 'Close' : 'Fermer'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default ExtraRoadEmployee;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8f9fa',
    },
    dateContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    navButton: {
        padding: 10,
        backgroundColor: '#001933',
        borderRadius: 50,
    },
    dateText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    roadCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    roadNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    separator: {
        height: 10,
    },
    emptyText: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        marginTop: 20,
    },
    loadingIndicator: {
        marginTop: 20,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        width: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalText: {
        fontSize: 16,
        marginBottom: 10,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        width: '100%',
    },
    interestedButton: {
        backgroundColor: '#28a745',
        padding: 10,
        borderRadius: 5,
        width: '45%',
        alignItems: 'center',
    },
    notInterestedButton: {
        backgroundColor: '#dc3545',
        padding: 10,
        borderRadius: 5,
        width: '45%',
        alignItems: 'center',
    },
    closeButton: {
        backgroundColor: '#6c757d',
        padding: 10,
        borderRadius: 5,
        marginTop: 20,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    statusIcons: {
        flexDirection: 'row',
        marginTop: 5,
        justifyContent: 'space-between',
        width: 80, // Adjust spacing as needed
    },
    roadInfo: {
        flexDirection: 'column',
        justifyContent: 'space-between',
    },

});
