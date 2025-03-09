import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import AppURL from "@/components/src/URL";
import { getSocket, disconnectSocket } from '@/components/src/socket';
import { Socket } from 'socket.io-client';

// 📌 Interface complète de l'utilisateur
interface User {
    _id: string;
    name: string;
    familyName: string;
    tel: string;
    email: string;
    password: string;
    role: string;
    scoreCard: string;
    focusArea?: string;
    Transporter_ID?: string;
    expoPushToken?: string;
    quiz?: boolean;
    language?: string;
    dsp_code: string;
}

// 📌 Ajout de `socket` pour gérer les connexions Socket.IO
interface UserContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    saveUser: (userId: string, dspCode: string) => Promise<void>;
    logout: () => Promise<void>;
    loadingContext: boolean;
    dspCode: string | null;
    socket: Socket | null; // 🔥 Ajout du socket ici
    accessDenied: boolean; // 🔥 Ajout du statut accessDenied ici
    isConnected: boolean;

}

// 📌 Création du contexte utilisateur
const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loadingContext, setLoadingContext] = useState(true);
    const [dspCode, setDspCode] = useState<string | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null); // 🔥 État du socket
    const [accessDenied, setAccessDenied] = useState(false);
    const [isConnected, setIsConnected] = useState(false); // 🔥 État de connexion

    // ✅ Fonction pour récupérer le profil utilisateur depuis l'API avec dsp_code
    const loadUserFromAPI = async (userId: string, dspCode: string) => {
        try {
            const response = await axios.get(`${AppURL}/api/employee/profile/${userId}`, {
                params: { dsp_code: dspCode },
                validateStatus: (status) => true
            });

            if (response.status === 499) {
                setAccessDenied(true);
                setUser(null);
            } else {
                setUser(response.data);
                setAccessDenied(false);
            }
        } catch (error) {
            console.error("❌ Erreur lors de la récupération du profil :", error);
            setUser(null);
        }
    };

    // 🔥 Initialisation du socket lors de la connexion de l'utilisateur
    useEffect(() => {
        const loadUser = async () => {
            try {
                const storedUserId = await AsyncStorage.getItem("userId");
                const storedDspCode = await AsyncStorage.getItem("dspCode");

                if (storedUserId && storedDspCode) {
                    setDspCode(storedDspCode);
                    await loadUserFromAPI(storedUserId, storedDspCode);
                    setIsConnected(true); // 🔥 Utilisateur trouvé, on le considère connecté
                } else {
                    setUser(null);
                    setDspCode(null);
                    setIsConnected(false); // 🔥 Aucun utilisateur, on n'est pas connecté
                    setAccessDenied(false);
                }
            } catch (error) {
                console.error("❌ Erreur lors du chargement depuis AsyncStorage:", error);
                setUser(null);
                setIsConnected(false); // 🔥 Erreur => Déconnecté par sécurité
            } finally {
                setLoadingContext(false); // 🔥 On termine le chargement ici
            }
        };

        loadUser();
    }, []);

    // ✅ Charger l'utilisateur à chaque ouverture de l'application
    useEffect(() => {
        if (user && user.dsp_code) {
            const newSocket = getSocket(user.dsp_code); // ⚡️ Utilisation de getSocket
            setSocket(newSocket);

            // 📌 Événement de connexion
            newSocket.on('connect', () => {
            });

            // 📌 Événement de déconnexion
            newSocket.on('disconnect', () => {
            });

            return () => {
                disconnectSocket(newSocket);
                setSocket(null);
            };
        }
    }, [user]);



    // ✅ Fonction pour sauvegarder uniquement l’ID et le DSP_CODE
    const saveUser = async (userId: string, dspCode: string) => {
        try {
            await AsyncStorage.setItem("userId", userId);
            await AsyncStorage.setItem("dspCode", dspCode);
            setDspCode(dspCode);
            await loadUserFromAPI(userId, dspCode); // 🚀 Charge immédiatement les infos
        } catch (error) {
            console.error("❌ Erreur lors de la sauvegarde de l'utilisateur :", error);

        }
    };

    // ✅ Fonction pour la déconnexion (avec déconnexion du socket)
    const logout = async () => {
        try {
            await AsyncStorage.multiRemove([
                "userId",
                "dspCode",
                "sb-bfbltcamnpiimgcqsbuh-auth-token",
                "lastVisitedPage",
                "predictedDecisions",
                "predictedDisponibilities",
            ]);

            setUser(null);
            setDspCode(null);

            if (socket) disconnectSocket(socket);
            setSocket(null);

            console.log("✅ Déconnexion réussie !");
        } catch (error) {
            console.error("❌ Erreur lors de la déconnexion :", error);
        }
    };


    return (
        <UserContext.Provider value={{ user, setUser, saveUser, logout, loadingContext, dspCode, socket, accessDenied, isConnected }}>
            {children}
        </UserContext.Provider>
    );

};

// 📌 Hook pour accéder facilement aux données utilisateur
export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("❌ useUser doit être utilisé dans un UserProvider");
    }
    return context;
};
