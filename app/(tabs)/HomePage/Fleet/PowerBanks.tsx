import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    Pressable,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRoute } from '@react-navigation/native';
import AppURL from '@/components/src/URL';


type PowerBank = {
    _id: string;
    name: string;
    functional: boolean;
    comment: string;
};

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


const PowerBanks: React.FC = () => {
    const route = useRoute();
    const { user } = route.params as { user: User };
    const [powerBanks, setPowerBanks] = useState<PowerBank[]>([]);
    const [filteredPowerBanks, setFilteredPowerBanks] = useState<PowerBank[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [selectedPowerBank, setSelectedPowerBank] = useState<PowerBank | null>(null);
    const [searchText, setSearchText] = useState<string>('');
    const [statsModalVisible, setStatsModalVisible] = useState<boolean>(false);
    const [powerBankDetails, setPowerBankDetails] = useState({
        name: '',
        functional: true,
        comment: '', // Nouveau champ
    });


    const fetchPowerBanks = async () => {
        setLoading(true);
        try {
            const response = await axios.get<PowerBank[]>(`${AppURL}/api/powerbanks/powerbanks?dsp_code=${user.dsp_code}`);
            setPowerBanks(response.data);
            setFilteredPowerBanks(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch powerbanks. Please check your network connection.');
        } finally {
            setLoading(false);
        }
    };

    const totalPowerBanks = powerBanks.length;
    const functionalPowerBanks = powerBanks.filter((pb) => pb.functional).length;
    const nonFunctionalPowerBanks = totalPowerBanks - functionalPowerBanks;

    useEffect(() => {
        fetchPowerBanks();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchPowerBanks();
        setRefreshing(false);
    }, []);

    const handleSearch = (text: string) => {
        setSearchText(text);
        const lowercasedText = text.toLowerCase();
        const filtered = powerBanks.filter((pb) => {
            const name = pb.name.toLowerCase();
            const functional = pb.functional;

            return (
                name.includes(lowercasedText) ||
                (lowercasedText === 'true' && functional) ||
                (lowercasedText === 'false' && !functional)
            );
        });
        setFilteredPowerBanks(filtered);
    };

    const handleOpenModal = (powerBank: PowerBank | null = null) => {
        if (powerBank) {
            setSelectedPowerBank(powerBank);
            setPowerBankDetails({
                name: powerBank.name,
                functional: powerBank.functional,
                comment: powerBank.comment
            });
            setIsEditing(true);
        } else {
            setSelectedPowerBank(null);
            setPowerBankDetails({ name: '', functional: true, comment: '' });
            setIsEditing(false);
        }
        setModalVisible(true);
    };

    const handleAddPowerBank = async () => {
        const { name, comment } = powerBankDetails;

        if (!name) {
            Alert.alert('Validation Error', 'Please fill in all required fields.');
            return;
        }

        try {
            const response = await axios.post<PowerBank>(`${AppURL}/api/powerbanks/powerbanks?dsp_code=${user.dsp_code}`, {
                name,
                functional: powerBankDetails.functional,
                comment, // Nouveau champ
            });
            setPowerBanks((prev) => [...prev, response.data]);
            setFilteredPowerBanks((prev) => [...prev, response.data]);
            Alert.alert('Success', 'PowerBank added successfully!');
            setModalVisible(false);
        } catch (err) {
            Alert.alert('Error', 'Failed to add powerbank.');
        }
    };


    const handleUpdatePowerBank = async () => {
        if (!selectedPowerBank) return;

        try {
            const response = await axios.put<PowerBank>(
                `${AppURL}/api/powerbanks/powerbanks/${selectedPowerBank._id}?dsp_code=${user.dsp_code}`,
                {
                    name: powerBankDetails.name,
                    functional: powerBankDetails.functional,
                    comment: powerBankDetails.comment, // Nouveau champ
                }
            );
            setPowerBanks((prev) =>
                prev.map((pb) => (pb._id === selectedPowerBank._id ? response.data : pb))
            );
            setFilteredPowerBanks((prev) =>
                prev.map((pb) => (pb._id === selectedPowerBank._id ? response.data : pb))
            );
            Alert.alert('Success', 'PowerBank updated successfully!');
            setModalVisible(false);
        } catch (err) {
            Alert.alert('Error', 'Failed to update powerbank.');
        }
    };


    const handleDeletePowerBank = async () => {
        if (!selectedPowerBank) return;

        try {
            await axios.delete(`${AppURL}/api/powerbanks/powerbanks/${selectedPowerBank._id}?dsp_code=${user.dsp_code}`);
            setPowerBanks((prev) => prev.filter((pb) => pb._id !== selectedPowerBank._id));
            setFilteredPowerBanks((prev) => prev.filter((pb) => pb._id !== selectedPowerBank._id));
            Alert.alert('Success', 'PowerBank deleted successfully!');
            setModalVisible(false);
        } catch (err) {
            Alert.alert('Error', 'Failed to delete powerbank.');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#001933" />
                <Text style={styles.loadingText}>
                    {user.language === 'English' ? 'Loading powerbanks...' : 'Chargement des powerbanks...'}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {user.language === 'English' ? 'PowerBank Management' : 'Gestion des PowerBanks'}
            </Text>

            <TextInput
                style={styles.searchBar}
                placeholder={user.language === 'English' ? 'Search by name' : 'Rechercher par nom'}
                value={searchText}
                onChangeText={handleSearch}
            />
            <FlatList
                data={filteredPowerBanks}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.item,
                            { backgroundColor: item.functional ? '#81c784' : '#e57373' },
                        ]}
                        onPress={() => handleOpenModal(item)}
                    >
                        <Text style={styles.itemTitle}>{item.name}</Text>

                    </TouchableOpacity>
                )}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
            <TouchableOpacity style={styles.statsButton} onPress={() => setStatsModalVisible(true)}>
                <Ionicons name="stats-chart" size={24} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={() => handleOpenModal()}>
                <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {user.language === 'English' ? (isEditing ? 'Edit PowerBank' : 'Add PowerBank') : (isEditing ? 'Modifier PowerBank' : 'Ajouter PowerBank')}
                        </Text>

                        <TextInput
                            style={styles.input}
                            value={powerBankDetails.name || ''} // Garantit une chaîne vide si name est indéfini
                            onChangeText={(text) => setPowerBankDetails({ ...powerBankDetails, name: text })}
                            placeholder={
                                user.language === 'English'
                                    ? 'Enter powerbank name'
                                    : 'Entrez le nom du powerbank'
                            }
                        />
                        <TextInput
                            style={styles.input}
                            value={powerBankDetails.comment || ''} // Garantit une chaîne vide si comment est indéfini
                            onChangeText={(text) => setPowerBankDetails({ ...powerBankDetails, comment: text })}
                            placeholder={
                                user.language === 'English'
                                    ? 'Enter comment'
                                    : 'Entrez un commentaire'
                            }
                        />

                        <View style={styles.toggleContainer}>
                            <Text style={styles.label}>
                                {user.language === 'English' ? 'Functional:' : 'Fonctionnel :'}
                            </Text>
                            <Switch
                                value={powerBankDetails.functional}
                                onValueChange={(value) => setPowerBankDetails({ ...powerBankDetails, functional: value })}
                                trackColor={{ false: '#ffcdd2', true: '#c8e6c9' }}
                                thumbColor={powerBankDetails.functional ? '#4caf50' : '#f44336'}
                            />
                            <Text
                                style={[
                                    styles.toggleLabel,
                                    { backgroundColor: powerBankDetails.functional ? '#c8e6c9' : '#ffcdd2' },
                                ]}
                            >
                                {user.language === 'English'
                                    ? (powerBankDetails.functional ? 'Functional' : 'Non-Functional')
                                    : (powerBankDetails.functional ? 'Fonctionnel' : 'Non-Fonctionnel')}
                            </Text>
                        </View>
                        <View style={styles.buttonContainer}>
                            {isEditing ? (
                                <>
                                    <Pressable style={styles.button} onPress={handleUpdatePowerBank}>
                                        <Text style={styles.buttonText}>
                                            {user.language === 'English' ? 'Update' : 'Mettre à jour'}
                                        </Text>
                                    </Pressable>
                                    <Pressable style={styles.buttonDelete} onPress={handleDeletePowerBank}>
                                        <Text style={styles.buttonText}>
                                            {user.language === 'English' ? 'Delete' : 'Supprimer'}
                                        </Text>
                                    </Pressable>
                                </>

                            ) : (
                                <Pressable style={styles.button} onPress={handleAddPowerBank}>
                                    <Text style={styles.buttonText}>
                                        {user.language === 'English' ? 'Add' : 'Ajouter'}
                                    </Text>
                                </Pressable>
                            )}
                            <Pressable style={styles.buttonClose} onPress={() => setModalVisible(false)}>
                                <Text style={styles.buttonText}>
                                    {user.language === 'English' ? 'Close' : 'Fermer'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                animationType="slide"
                transparent
                visible={statsModalVisible}
                onRequestClose={() => setStatsModalVisible(false)}
            >
                <View style={styles.modalContainerStats}>
                    <View style={styles.modalContentStats}>
                        <Text style={styles.modalTitleStats}>
                            {user.language === 'English' ? 'PowerBank Statistics' : 'Statistiques des PowerBanks'}
                        </Text>
                        <Text style={styles.statTextStats}>
                            {user.language === 'English' ? `Total PowerBanks: ${totalPowerBanks}` : `Total des PowerBanks: ${totalPowerBanks}`}
                        </Text>
                        <Text style={styles.statTextStats}>
                            {user.language === 'English' ? `Functional: ${functionalPowerBanks}` : `Fonctionnels: ${functionalPowerBanks}`}
                        </Text>
                        <Text style={styles.statTextStats}>
                            {user.language === 'English' ? `Non-Functional: ${nonFunctionalPowerBanks}` : `Non-Fonctionnels: ${nonFunctionalPowerBanks}`}
                        </Text>
                        <Pressable style={styles.buttonCloseStats} onPress={() => setStatsModalVisible(false)}>
                            <Text style={styles.buttonTextStats}>
                                {user.language === 'English' ? 'Close' : 'Fermer'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa', },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, justifyContent: 'center' },
    searchBar: {
        borderWidth: 1,
        borderColor: '#001933',
        borderRadius: 25, // Rounded corners for a smoother look
        paddingVertical: 10, // Adjust vertical padding for better spacing
        paddingHorizontal: 15, // Horizontal padding for comfortable typing
        marginBottom: 15,
        backgroundColor: '#ffffff',
        fontSize: 16, // Larger font size for better readability
        elevation: 3, // Add subtle shadow for depth
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
    },
    item: {
        padding: 15,
        marginVertical: 8,
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    itemTitle: { fontSize: 18, fontWeight: 'bold', color: '#212529' },
    itemSubtitle: { fontSize: 14, color: '#555', fontWeight: 'bold' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, fontSize: 16 },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: '#ffffff', padding: 20, borderRadius: 8, width: '90%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 5, padding: 10, marginBottom: 15 },
    toggleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    label: { fontSize: 16, fontWeight: 'bold', marginRight: 10 },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    button: { backgroundColor: '#001933', padding: 10, margin: 5, borderRadius: 5, flex: 1 },
    buttonDelete: { backgroundColor: '#dc3545', padding: 10, margin: 5, borderRadius: 5, flex: 1 },
    buttonClose: { backgroundColor: '#6c757d', padding: 10, margin: 5, borderRadius: 5, flex: 1 },
    buttonText: { color: '#ffffff', textAlign: 'center', fontWeight: 'bold' },
    addButton: {
        backgroundColor: '#001933',
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        bottom: 30, // Bouton "+" toujours en bas
        right: 30,
        elevation: 5,
        marginBottom: 10, // Ajout d'un espace entre les deux boutons
    },
    addButtonText: {
        color: '#fff',
        fontSize: 30,
        fontWeight: 'bold',
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        overflow: 'hidden',
        marginLeft: 10,
        textAlign: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    statsButton: {
        backgroundColor: '#001933',
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        bottom: 110, // Positionné juste au-dessus du bouton "+"
        right: 30,
        elevation: 5,
    },
    statTextStats: {
        fontSize: 18,
        marginVertical: 5,
        fontWeight: 'bold',
        color: '#333', // Changer la couleur pour qu'elle soit visible
        textAlign: 'center',
    },
    modalContainerStats: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalTitleStats: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#001933',
    },
    modalContentStats: {
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 10,
        width: '90%',
        alignItems: 'center',
    },
    buttonCloseStats: {
        backgroundColor: '#6c757d', // Couleur de fond
        paddingVertical: 12, // Augmentez le padding vertical
        paddingHorizontal: 20, // Padding horizontal pour plus de clicabilité
        margin: 10, // Espace autour du bouton
        borderRadius: 5, // Coins arrondis
        alignItems: 'center', // Centre horizontalement
        justifyContent: 'center', // Centre verticalement
        minHeight: 50, // Assure une hauteur minimum suffisante
        width: '100%', // Largeur complète pour un bouton bien aligné
    },
    buttonTextStats: {
        color: '#ffffff', // Texte visible en contraste
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 16, // Texte de taille adaptée
    },


});
export default PowerBanks;
