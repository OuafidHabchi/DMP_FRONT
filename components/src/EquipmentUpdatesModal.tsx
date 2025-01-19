import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Image,
    TextInput,
} from 'react-native';
import axios from 'axios';
import AppURL from './URL';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage


interface EquipmentUpdate {
    _id: string;
    employeeName: string;
    vanName: string;
    localTime: string;
    day: string;
    photoType: string;
    imagePath: string;
    userId: string;
}

interface Employee {
    _id: string;
    name: string;
    familyName: string;
}

interface TimeCard {
    employeeId: string;
}

interface EquipmentUpdatesModalProps {
    day: string;
    photoType: string;
    dspCode: string;
    onClose: () => void;
}

const EquipmentUpdatesModal: React.FC<EquipmentUpdatesModalProps> = ({
    day,
    photoType,
    dspCode,
    onClose,
}) => {
    const [equipmentUpdates, setEquipmentUpdates] = useState<EquipmentUpdate[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isImageModalVisible, setIsImageModalVisible] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState<string>(''); // État pour la recherche


    useEffect(() => {
        const fetchUpdatesAndEmployees = async () => {
            setLoading(true);

            try {
                const formattedDate = day;

                // Use Promise.all to fetch equipment updates and time cards concurrently
                const [updatesResponse, timeCardsResponse] = await Promise.all([
                    axios.get<EquipmentUpdate[]>(`${AppURL}/api/equipment-update/equipment-updates-by-date`, {
                        params: { day, photoType, dsp_code: dspCode },
                    }).catch(() => ({ data: [] as EquipmentUpdate[] })), // Ensure this always resolves to an object with data
                    axios.get<TimeCard[]>(`${AppURL}/api/timecards/timecardsss/dday/${formattedDate}?dsp_code=${dspCode}`)
                        .catch(() => ({ data: [] as TimeCard[] })), // Handle potential failures
                ]);

                const equipmentUpdates = updatesResponse.data; // TypeScript now knows this is always defined
                const timeCards = timeCardsResponse.data;

                // Fetch employee details for all employees in the time cards
                const employeeIds = timeCards.map((tc) => tc.employeeId);
                const employeesResponse = await axios.post<Employee[]>(
                    `${AppURL}/api/employee/by-ids`,
                    { ids: employeeIds },
                    { params: { dsp_code: dspCode } }
                );

                setEquipmentUpdates(equipmentUpdates);
                setEmployees(employeesResponse.data);
            } catch (error) {
                console.error('Error fetching updates and employees:', error);
                setEquipmentUpdates([]); // Ensure state is still set to avoid infinite loading
                setEmployees([]);
            } finally {
                setLoading(false);
            }
        };

        fetchUpdatesAndEmployees();
    }, [day, photoType, dspCode]);




    const renderEmployeeItem = (employee: Employee): JSX.Element => {
        const update = equipmentUpdates.find((u) => u.userId === employee._id);
        const hasPhoto = !!update;

        return (
            <TouchableOpacity
                key={employee._id}
                style={[
                    styles.employeeContainer,
                    hasPhoto ? styles.hasPhoto : styles.noPhoto,
                ]}
                onPress={() => {
                    if (hasPhoto) {
                        setSelectedImage(update!.imagePath);
                        setIsImageModalVisible(true);
                    }
                }}
            >
                <Text style={styles.employeeName}>{`${employee.name} ${employee.familyName}`}</Text>
                {hasPhoto && (
                    <Text style={styles.photoDetails}>{`Van: ${update!.vanName}, Time: ${update!.localTime}`}</Text>
                )}
                {!hasPhoto && <Text style={styles.noPhotoText}>No photo uploaded</Text>}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#001933" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Equipment - {day} ({photoType})</Text>
            <TextInput
                style={styles.searchBar}
                placeholder="Search employees..."
                placeholderTextColor="#ccc"
                value={searchQuery}
                onChangeText={setSearchQuery}
            />

            <FlatList
                data={employees.filter((employee) =>
                    `${employee.name} ${employee.familyName}`
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                )}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => renderEmployeeItem(item)}
            />


            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>

            <Modal visible={isImageModalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        style={styles.modalCloseButton}
                        onPress={() => setIsImageModalVisible(false)}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                    {selectedImage && (
                        <>
                            {imageLoading && (
                                <ActivityIndicator size="large" color="#fff" style={styles.loadingIndicator} />
                            )}
                            <Image
                                source={{ uri: `${AppURL}${selectedImage.replace(/\\/g, '/')}` }}
                                style={styles.modalImage}
                                onLoadStart={() => setImageLoading(true)}
                                onLoadEnd={() => setImageLoading(false)}
                            />
                        </>
                    )}
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({

    searchBar: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 20,
        height: 50,
        borderWidth: 1,
        borderColor: '#001933',
        color: '#2c3e50',
        fontSize: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#F9FAFB',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#001933',
        marginBottom: 20,
        textAlign: 'center',
    },
    employeeContainer: {
        padding: 15,
        marginBottom: 10,
        borderRadius: 10,
    },
    hasPhoto: {
        backgroundColor: '#D4EDDA',
    },
    noPhoto: {
        backgroundColor: '#F8D7DA',
    },
    employeeName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#155724',
    },
    photoDetails: {
        fontSize: 14,
        color: '#155724',
    },
    noPhotoText: {
        fontSize: 14,
        color: '#721C24',
    },
    closeButton: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#001933',
        borderRadius: 8,
        alignItems: 'center',
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    modalImage: {
        width: '90%',
        height: '70%',
        resizeMode: 'contain',
        borderRadius: 10,
    },
    modalCloseButton: {
        position: 'absolute',
        top: 30,
        right: 20,
        backgroundColor: '#001933',
        padding: 10,
        borderRadius: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#001933',
    },
    loadingText: {
        fontSize: 16,
        color: '#fff',
        marginTop: 10,
    },
    loadingIndicator: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -15 }, { translateY: -15 }],
    },
});

export default EquipmentUpdatesModal;
