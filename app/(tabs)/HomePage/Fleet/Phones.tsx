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
    Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRoute } from '@react-navigation/native';
import AppURL from '@/components/src/URL';


type Phone = {
    _id: string;
    name: string;
    number: string;
    supplier: string;
    model: string;
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


const Phones: React.FC = () => {
    const route = useRoute();
    const { user } = route.params as { user: User };
    const [phones, setPhones] = useState<Phone[]>([]);
    const [filteredPhones, setFilteredPhones] = useState<Phone[]>([]); // Téléphones filtrés pour la recherche
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [selectedPhone, setSelectedPhone] = useState<Phone | null>(null);
    const [searchText, setSearchText] = useState<string>(''); // État de la barre de recherche
    const [statsModalVisible, setStatsModalVisible] = useState<boolean>(false); // Modal pour les stats
    const [phoneDetails, setPhoneDetails] = useState({
        name: '',
        number: '',
        supplier: '',
        model: '',
        functional: true,
        comment: '', // Nouveau champ
    });

    const fetchPhones = async () => {
        setLoading(true);
        try {
            const response = await axios.get<Phone[]>(`${AppURL}/api/phones/phones?dsp_code=${user.dsp_code}`);
            setPhones(response.data);
            setFilteredPhones(response.data); // Initialiser les téléphones filtrés
            setError(null);
        } catch (err) {
            setError('Failed to fetch phones. Please check your network connection.');
        } finally {
            setLoading(false);
        }
    };
    const totalPhones = phones.length;
    const functionalPhones = phones.filter((phone) => phone.functional).length;
    const nonFunctionalPhones = totalPhones - functionalPhones;


    useEffect(() => {
        fetchPhones();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchPhones();
        setRefreshing(false);
    }, []);

    // Fonction de recherche
    const handleSearch = (text: string) => {
        setSearchText(text);
        const lowercasedText = text.toLowerCase();
        const filtered = phones.filter((phone) => {
            const name = phone.name?.toLowerCase() || '';
            const number = phone.number || '';
            const supplier = phone.supplier?.toLowerCase() || '';
            const model = phone.model?.toLowerCase() || '';
            const functional = phone.functional;

            return (
                name.includes(lowercasedText) ||
                number.includes(lowercasedText) ||
                supplier.includes(lowercasedText) ||
                model.includes(lowercasedText) ||
                (lowercasedText === 'true' && functional) ||
                (lowercasedText === 'false' && !functional)
            );
        });
        setFilteredPhones(filtered);
    };


    const handleOpenModal = (phone: Phone | null = null) => {
        if (phone) {
            setSelectedPhone(phone);
            setPhoneDetails({
                name: phone.name,
                number: phone.number,
                supplier: phone.supplier,
                model: phone.model,
                functional: phone.functional,
                comment: phone.comment,
            });
            setIsEditing(true);
        } else {
            setSelectedPhone(null);
            setPhoneDetails({ name: '', number: '', supplier: '', model: '', functional: true, comment: '' });
            setIsEditing(false);
        }
        setModalVisible(true);
    };

    const handleCopyNumber = (number: string) => {
        Clipboard.setString(number);
        Alert.alert(
            user.language === 'English' ? 'Copied' : 'Copié',
            user.language === 'English' ? 'Phone number copied to clipboard!' : 'Numéro de téléphone copié dans le presse-papiers!'
        );

    };

    const handleAddPhone = async () => {
        const { name, number, supplier, model, comment } = phoneDetails;

        if (!name || !number || !supplier || !model) {
            Alert.alert(
                user.language === 'English' ? 'Validation Error' : 'Erreur de Validation',
                user.language === 'English' ? 'Please fill in all required fields.' : 'Veuillez remplir tous les champs obligatoires.'
            );
            return;
        }

        try {
            const response = await axios.post<Phone>(`${AppURL}/api/phones/phones/create?dsp_code=${user.dsp_code}`, {
                name,
                number,
                supplier,
                model,
                functional: phoneDetails.functional,
                comment, // Nouveau champ
            });
            setPhones((prev) => [...prev, response.data]);
            setFilteredPhones((prev) => [...prev, response.data]); // Mettre à jour les résultats filtrés
            Alert.alert('Success', 'Phone added successfully!');
            setModalVisible(false);
        } catch (err) {
            Alert.alert('Error', 'Failed to add phone.');
        }
    };


    const handleUpdatePhone = async () => {
        if (!selectedPhone) return;

        try {
            const response = await axios.put<Phone>(
                `${AppURL}/api/phones/phones/${selectedPhone._id}?dsp_code=${user.dsp_code}`,
                {
                    name: phoneDetails.name,
                    number: phoneDetails.number,
                    supplier: phoneDetails.supplier,
                    model: phoneDetails.model,
                    functional: phoneDetails.functional,
                    comment: phoneDetails.comment, // Nouveau champ
                }
            );
            setPhones((prev) =>
                prev.map((phone) => (phone._id === selectedPhone._id ? response.data : phone))
            );
            setFilteredPhones((prev) =>
                prev.map((phone) => (phone._id === selectedPhone._id ? response.data : phone))
            );
            Alert.alert('Success', 'Phone updated successfully!');
            setModalVisible(false);
        } catch (err) {
            Alert.alert('Error', 'Failed to update phone.');
        }
    };


    const handleDeletePhone = async () => {
        if (!selectedPhone) return;

        try {
            await axios.delete(`${AppURL}/api/phones/phones/${selectedPhone._id}?dsp_code=${user.dsp_code}`);
            setPhones((prev) => prev.filter((phone) => phone._id !== selectedPhone._id));
            setFilteredPhones((prev) => prev.filter((phone) => phone._id !== selectedPhone._id));
            Alert.alert('Success', 'Phone deleted successfully!');
            setModalVisible(false);
        } catch (err) {
            Alert.alert('Error', 'Failed to delete phone.');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#001933" />
                <Text style={styles.loadingText}>
                    {user.language === 'English' ? 'Loading phones...' : 'Chargement des téléphones...'}
                </Text>

            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>
                    {user.language === 'English' ? 'Phone Management' : 'Gestion des Téléphones'}
                </Text>
            </View>

            {/* Barre de recherche */}
            <TextInput
                style={styles.searchBar}
                placeholder={user.language === 'English' ? 'Search by name, number, supplier, model' : 'Rechercher par nom, numéro, fournisseur, modèle'}
                value={searchText}
                onChangeText={handleSearch}
            />

            <FlatList
                data={filteredPhones}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.item,
                            { backgroundColor: item.functional ? '#81c784' : '#e57373' },
                        ]}
                        onPress={() => handleOpenModal(item)}
                        onLongPress={() => handleCopyNumber(item.number)}
                    >
                        <Text style={styles.itemTitle}>{item.name}</Text>
                        <Text style={styles.itemSubtitle}>{item.number}</Text>
                    </TouchableOpacity>
                )}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />

            <TouchableOpacity
                style={styles.statsButton}
                onPress={() => setStatsModalVisible(true)}
            >
                <Ionicons name="stats-chart" size={24} color="#ffff" />
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
                            {user.language === 'English'
                                ? (isEditing ? 'Edit Phone' : 'Add Phone')
                                : (isEditing ? 'Modifier le Téléphone' : 'Ajouter un Téléphone')}
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={phoneDetails.name}
                            onChangeText={(text) => setPhoneDetails({ ...phoneDetails, name: text })}
                            placeholder={user.language === 'English' ? 'Enter phone name' : 'Entrez le nom du téléphone'}
                        />
                        <TextInput
                            style={styles.input}
                            value={phoneDetails.number}
                            onChangeText={(text) => setPhoneDetails({ ...phoneDetails, number: text })}
                            placeholder={user.language === 'English' ? 'Enter phone number' : 'Entrez le numéro de téléphone'}
                            keyboardType="phone-pad"
                        />
                        <TextInput
                            style={styles.input}
                            value={phoneDetails.supplier}
                            onChangeText={(text) => setPhoneDetails({ ...phoneDetails, supplier: text })}
                            placeholder={user.language === 'English' ? 'Enter supplier name' : 'Entrez le nom du fournisseur'}
                        />
                        <TextInput
                            style={styles.input}
                            value={phoneDetails.model}
                            onChangeText={(text) => setPhoneDetails({ ...phoneDetails, model: text })}
                            placeholder={user.language === 'English' ? 'Enter phone model' : 'Entrez le modèle du téléphone'}
                        />
                        <TextInput
                            style={styles.input}
                            value={phoneDetails.comment || ''} // Utilisez une chaîne vide comme valeur par défaut
                            onChangeText={(text) => setPhoneDetails({ ...phoneDetails, comment: text })}
                            placeholder={
                                user.language === 'English'
                                    ? 'Enter a comment'
                                    : 'Entrez un commentaire'
                            }
                        />


                        <View style={styles.toggleContainer}>
                            <Text style={styles.label}>
                                {user.language === 'English' ? 'Functional:' : 'Fonctionnel :'}
                            </Text>
                            <Switch
                                value={phoneDetails.functional}
                                onValueChange={(value) => setPhoneDetails({ ...phoneDetails, functional: value })}
                                trackColor={{ false: '#ffcdd2', true: '#c8e6c9' }}
                                thumbColor={phoneDetails.functional ? '#4caf50' : '#f44336'}
                            />
                            <Text
                                style={[
                                    styles.toggleLabel,
                                    { backgroundColor: phoneDetails.functional ? '#c8e6c9' : '#ffcdd2' },
                                ]}
                            >
                                {user.language === 'English'
                                    ? (phoneDetails.functional ? 'Functional' : 'Non-Functional')
                                    : (phoneDetails.functional ? 'Fonctionnel' : 'Non-Fonctionnel')}
                            </Text>
                        </View>


                        <View style={styles.buttonContainer}>
                            {isEditing ? (
                                <>
                                    <Pressable style={styles.button} onPress={handleUpdatePhone}>
                                        <Text style={styles.buttonText}>
                                            {user.language === 'English' ? 'Update' : 'Mettre à jour'}
                                        </Text>
                                    </Pressable>
                                    <Pressable style={styles.buttonDelete} onPress={handleDeletePhone}>
                                        <Text style={styles.buttonText}>
                                            {user.language === 'English' ? 'Delete' : 'Supprimer'}
                                        </Text>
                                    </Pressable>

                                </>
                            ) : (
                                <Pressable style={styles.button} onPress={handleAddPhone}>
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
                            {user.language === 'English' ? 'Phone Statistics' : 'Statistiques des Téléphones'}
                        </Text>
                        <Text style={styles.statTextStats}>
                            {user.language === 'English' ? `Total Phones: ${totalPhones}` : `Total des Téléphones: ${totalPhones}`}
                        </Text>
                        <Text style={styles.statTextStats}>
                            {user.language === 'English' ? `Functional Phones: ${functionalPhones}` : `Téléphones Fonctionnels: ${functionalPhones}`}
                        </Text>
                        <Text style={styles.statTextStats}>
                            {user.language === 'English' ? `Non-Functional Phones: ${nonFunctionalPhones}` : `Téléphones Non-Fonctionnels: ${nonFunctionalPhones}`}
                        </Text>
                        <Pressable
                            style={styles.buttonCloseStats}
                            onPress={() => setStatsModalVisible(false)}
                        >
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

export default Phones;
