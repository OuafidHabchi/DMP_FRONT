import React, { useState, useEffect } from 'react';
import { FlatList, StyleSheet, Text, View, TouchableOpacity, Modal, TextInput, Alert, RefreshControl, Platform, ToastAndroid, ScrollView } from 'react-native';
import axios from 'axios';
import AppURL from '@/components/src/URL';
import { useUser } from '@/context/UserContext';

type StatusType = {
    _id: string;
    name: string;
    location: string;
    color: string;
};

const StatusScreen = () => {
    const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
    const [statuses, setStatuses] = useState<StatusType[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<StatusType | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [newStatus, setNewStatus] = useState({ name: '', location: '', color: '' });
    const [refreshing, setRefreshing] = useState(false);
    // Fetch statuses from the backend
    const fetchStatuses = async () => {
        try {
            const response = await axios.get(`${AppURL}/api/statuses/all?dsp_code=${user?.dsp_code}`);
            setStatuses(response.data);
        } catch (error) {
            showMessage('Failed to fetch statuses', 'error');
        }
    };

    // Function to display success or failure messages
    const showMessage = (message: string, type: 'success' | 'error') => {
        if (Platform.OS === 'web') {
            // Utiliser alert pour le web
            alert(message);
        } else {
            // Utiliser Alert.alert pour mobile (iOS/Android)
            Alert.alert(type === 'success' ? 'Success' : 'Error', message);
        }
    };


    // Refresh list function
    const onRefresh = async () => {
        setRefreshing(true);
        await fetchStatuses();
        setRefreshing(false);
    };

    // Add a new status
    const createStatus = async () => {
        // Vérification des champs obligatoires
        if (!newStatus.name || !newStatus.location || !newStatus.color) {
            const errorMessage = user?.language === 'English'
                ? 'All fields are required. Please fill in all the information.'
                : 'Tous les champs sont obligatoires. Veuillez remplir toutes les informations.';

            Alert.alert('Error', errorMessage);
            if (Platform.OS === 'web') window.alert(errorMessage);
            return;
        }

        try {
            const response = await axios.post(`${AppURL}/api/statuses/create?dsp_code=${user?.dsp_code}`, newStatus);

            setStatuses([...statuses, response.data]);
            setIsAddModalVisible(false); // Fermer le modal après création réussie
            setNewStatus({ name: '', location: '', color: '' }); // Réinitialiser le formulaire

            const successMessage = user?.language === 'English'
                ? 'Status added successfully'
                : 'Statut ajouté avec succès';

            showMessage(successMessage, 'success');
        } catch (error) {
            const errorMessage = user?.language === 'English'
                ? 'Failed to create status'
                : 'Échec de la création du statut';

            showMessage(errorMessage, 'error');
        }
    };


    // Update a status
    const updateStatus = async () => {
        if (selectedStatus) {
            try {
                const response = await axios.put(`${AppURL}/api/statuses/${selectedStatus._id}?dsp_code=${user?.dsp_code}`, selectedStatus);
                setStatuses(
                    statuses.map(status => (status._id === selectedStatus._id ? response.data : status))
                );
                setIsModalVisible(false); // Close modal after update
                showMessage(
                    user?.language === 'English' ? 'Status updated successfully' : 'Statut mis à jour avec succès',
                    'success'
                );
            } catch (error) {
                showMessage(
                    user?.language === 'English' ? 'Failed to update status' : 'Échec de la mise à jour du statut',
                    'error'
                );
            }
        }
    };


    // Delete a status
    const deleteStatus = async (id: string) => {
        const confirmationMessage = user?.language === 'English'
            ? 'Are you sure you want to delete this status?'
            : 'Êtes-vous sûr de vouloir supprimer ce statut ?';

        const successMessage = user?.language === 'English'
            ? 'Status deleted successfully'
            : 'Statut supprimé avec succès';

        const errorMessage = user?.language === 'English'
            ? 'Failed to delete status'
            : 'Échec de la suppression du statut';

        // Confirmation pour mobile
        if (Platform.OS !== 'web') {
            return Alert.alert(
                user?.language === 'English' ? 'Confirmation' : 'Confirmation',
                confirmationMessage,
                [
                    { text: user?.language === 'English' ? 'Cancel' : 'Annuler', style: 'cancel' },
                    { text: user?.language === 'English' ? 'Delete' : 'Supprimer', style: 'destructive', onPress: async () => await confirmDeleteStatus(id, successMessage, errorMessage) },
                ]
            );
        }

        // Confirmation pour Web
        if (window.confirm(confirmationMessage)) {
            await confirmDeleteStatus(id, successMessage, errorMessage);
        }
    };
    const confirmDeleteStatus = async (id: string, successMessage: string, errorMessage: string) => {
        try {
            await axios.delete(`${AppURL}/api/statuses/${id}?dsp_code=${user?.dsp_code}`);

            setStatuses(statuses.filter(status => status._id !== id));
            setIsModalVisible(false); // Fermer le modal après suppression

            showMessage(successMessage, 'success');
        } catch (error) {
            showMessage(errorMessage, 'error');
        }
    };



    useEffect(() => {
        fetchStatuses();
    }, []);

    const colors = [
        'red',
        'blue',
        'green',
        'orange',
        'purple',
        'cyan',
        'teal',
        'pink',
        'magenta',
        'indigo',
        'violet',
        'lime',
        'coral',
    ];


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.addButton} onPress={() => setIsAddModalVisible(true)}>
                    <Text style={styles.buttonText}>
                        {user?.language === 'English' ? 'Add a status' : 'Ajouter un statut'}
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={statuses}
                keyExtractor={item => item._id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.statusContainer, { backgroundColor: item.color }]}  // Use the status color as background
                        onPress={() => {
                            setSelectedStatus(item);
                            setIsModalVisible(true); // Open details modal
                        }}
                    >
                        <Text style={{ color: 'white' }}>{item.name}</Text>
                        <Text style={{ color: 'white' }}>{item.location}</Text>

                    </TouchableOpacity>
                )}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            />

            {/* Modal to add a status */}
            <Modal visible={isAddModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalWrapper}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {user?.language === 'English' ? 'Add a new status' : 'Ajouter un nouveau statut'}
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder={user?.language === 'English' ? 'Name' : 'Nom'}
                            value={newStatus.name}
                            onChangeText={text => setNewStatus({ ...newStatus, name: text })}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder={user?.language === 'English' ? 'Location' : 'Emplacement'}
                            value={newStatus.location}
                            onChangeText={text => setNewStatus({ ...newStatus, location: text })}
                        />
                        <Text style={styles.modalText}>
                            {user?.language === 'English' ? 'Select a color:' : 'Sélectionner une couleur :'}
                        </Text>
                        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                            {colors.map(color => (
                                <TouchableOpacity
                                    key={color}
                                    style={[styles.colorOption, { backgroundColor: color }]}
                                    onPress={() => setNewStatus({ ...newStatus, color })}
                                />
                            ))}
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.button} onPress={createStatus}>
                                <Text style={styles.buttonText}>
                                    {user?.language === 'English' ? 'Add' : 'Ajouter'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.buttonCancel} onPress={() => setIsAddModalVisible(false)}>
                                <Text style={styles.buttonText}>
                                    {user?.language === 'English' ? 'Cancel' : 'Annuler'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal to view/update a status */}
            {selectedStatus && (
                <Modal visible={isModalVisible} animationType="slide" transparent={true}>
                    <View style={styles.modalWrapper}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>
                                {user?.language === 'English' ? 'Status Details' : 'Détails du Statut'}
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder={user?.language === 'English' ? 'Name' : 'Nom'}
                                value={selectedStatus.name}
                                onChangeText={text => setSelectedStatus({ ...selectedStatus, name: text })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder={user?.language === 'English' ? 'Location' : 'Emplacement'}
                                value={selectedStatus.location}
                                onChangeText={text => setSelectedStatus({ ...selectedStatus, location: text })}
                            />

                            <Text style={styles.modalText}>
                                {user?.language === 'English' ? 'Select a color:' : 'Sélectionner une couleur :'}
                            </Text>
                            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                                {colors.map(color => (
                                    <TouchableOpacity
                                        key={color}
                                        style={[styles.colorOption, { backgroundColor: color }]}
                                        onPress={() => setSelectedStatus({ ...selectedStatus, color })}
                                    />
                                ))}
                            </ScrollView>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.button} onPress={updateStatus}>
                                    <Text style={styles.buttonText}>
                                        {user?.language === 'English' ? 'Update' : 'Mettre à jour'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.buttonDelete} onPress={() => deleteStatus(selectedStatus._id)}>
                                    <Text style={styles.buttonText}>
                                        {user?.language === 'English' ? 'Delete' : 'Supprimer'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.buttonCancel} onPress={() => setIsModalVisible(false)}>
                                    <Text style={styles.buttonText}>
                                        {user?.language === 'English' ? 'Cancel' : 'Annuler'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
};

export default StatusScreen;

const styles = StyleSheet.create({
    colorScroll: {
        marginVertical: 10,
        flexGrow: 0, // Prevent it from stretching vertically
    },
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    addButton: {
        backgroundColor: '#001933',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        marginRight: 5,
    },
    refreshButton: {
        backgroundColor: 'green',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        marginLeft: 5,
    },
    statusContainer: {
        padding: 15,
        marginVertical: 8,
        borderRadius: 8,
        elevation: 3,

    },
    modalWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    },
    modalContent: {
        width: '90%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 15, // Rounded corners
        elevation: 10, // Shadow for depth effect
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalText: {
        fontSize: 16,
        marginVertical: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#001933',
        padding: 10,
        marginVertical: 10,
        borderRadius: 5,
    },
    colorRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 10,
    },
    colorOption: {
        width: 40,
        height: 40,
        marginHorizontal: 5,
        borderRadius: 5,
    },
    modalButtons: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        backgroundColor: '#001933',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        flex: 1,
        marginRight: 5,
    },
    buttonCancel: {
        backgroundColor: 'gray', // Gray background for the cancel button
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        flex: 1,
        marginLeft: 5,
    },
    buttonDelete: {
        backgroundColor: 'red', // Red background for the delete button
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        flex: 1,
        marginLeft: 5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
});

