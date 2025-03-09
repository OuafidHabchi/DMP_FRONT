import React, { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { NotificationProvider } from "@/context/NotificationContext";
import { UserProvider, useUser } from "@/context/UserContext";
import { Platform, Text, View, ActivityIndicator } from "react-native";
import * as Linking from 'expo-linking';

const STORAGE_KEY = "lastVisitedRoute"; // Clé pour stocker l'URL sur le web

function RootContent() {
  const router = useRouter();
  const segments = useSegments();
  const { user, loadingContext, accessDenied, isConnected } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [isContextReady, setIsContextReady] = useState(false);
  const [isDeepLinkChecked, setIsDeepLinkChecked] = useState(false);
  const [deepLinkCode, setDeepLinkCode] = useState<string | null>(null);
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [isDeepLinkHandled, setIsDeepLinkHandled] = useState(false);



  // 🔥 Vérification du Deep Link en premier
  useEffect(() => {
    const handleDeepLink = (url: string | null) => {
      if (url) {
        const { queryParams } = Linking.parse(url);
        const code = queryParams ? (Array.isArray(queryParams['code']) ? queryParams['code'][0] : queryParams['code']) : null;
        const invitation = queryParams ? (Array.isArray(queryParams['invitationId']) ? queryParams['invitationId'][0] : queryParams['invitationId']) : null;

        if (code) {
          setDeepLinkCode(code); // ✅ Stocker le code du deep link
        }
        if (invitation) {
          setInvitationId(invitation); // ✅ Stocker l'invitationId du deep link
        }
        setIsDeepLinkHandled(true); // ✅ Marquer comme traité
        return;
      }
      setIsDeepLinkChecked(true);
    };


    const checkInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      handleDeepLink(initialUrl);
    };

    checkInitialURL();

    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);



  // ✅ Utilisation de useEffect pour gérer la redirection AccessDenied après que le composant soit prêt
  useEffect(() => {
    if (isMounted && accessDenied) {
      router.replace('/(auth)/AccessDenied'); // 🔴 Redirection globale
    }
  }, [accessDenied, isMounted]);


  // ✅ S'assurer que le contexte utilisateur est prêt
  useEffect(() => {

    if (!loadingContext) {
      setIsContextReady(true);
    }
  }, [loadingContext]);


  // 🔹 Sauvegarder l'URL actuelle avant le reload (seulement sur Web)
  useEffect(() => {
    if (Platform.OS === "web" && segments.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(segments));
    }
  }, [segments]);


  // ✅ Fusion des redirections avec isContextReady
  useEffect(() => {
    if (!isContextReady) return; // 🔥 Wait for deep link check and context

    // 🔥 Priorité au Deep Link
    // 🔥 Priorité au Deep Link
    if (deepLinkCode && invitationId && isDeepLinkHandled) {
      router.replace({
        pathname: '/(auth)/Sign_Up',
        params: { code: deepLinkCode, invitationId }  // ✅ On passe les deux paramètres
      });
      setIsDeepLinkHandled(false); // ✅ Marquer comme traité pour éviter plusieurs redirections
      return;
    }


    if (accessDenied) {
      router.replace('/(auth)/AccessDenied');
      return;
    }

    if (isConnected && user) {
      let shouldRedirect = false;
      let targetRoute = "";

      if (Platform.OS === "web") {
        const lastRoute = localStorage.getItem(STORAGE_KEY);
        if (lastRoute) {
          const parsedRoute = JSON.parse(lastRoute);
          if (parsedRoute.length > 0) {
            targetRoute = `/${parsedRoute.join("/")}`;

            if (
              (user.role === "manager" && targetRoute.startsWith("/(manager)")) ||
              (user.role === "driver" && targetRoute.startsWith("/(driver)"))
            ) {
              shouldRedirect = true;
            }
            else if (targetRoute.includes("/Messenger")) {
              targetRoute = user.role === "manager"
                ? "/(manager)/(tabs)/(messenger)/Messenger"
                : "/(driver)/(tabs)/(messenger)/Messenger";
              shouldRedirect = true;
            }
            else if (targetRoute.includes("/Profile")) {
              targetRoute = user.role === "manager"
                ? "/(manager)/(tabs)/(accueil)/Profile"
                : "/(driver)/(tabs)/(Employe)/Profile";
              shouldRedirect = true;
            }
          }
        }
      }

      if (shouldRedirect) {
        router.replace(targetRoute as any);
      } else {
        if (user.role === "manager") {
          router.replace("/(manager)/(tabs)/(accueil)/Accueil");
        } else if (user.role === "driver") {
          router.replace("/(driver)/(tabs)/(Employe)/AcceuilEmployee");
        } else {
          router.replace("/(auth)/Sign_In");
        }
      }
    }

    if (!isConnected && !user) {
      router.replace("/(auth)/Sign_In");
    }

  }, [user, isConnected, accessDenied, isContextReady, isDeepLinkChecked]);



  // ✅ Loader pendant le chargement du contexte utilisateur
  if (loadingContext || !isContextReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#001933" />
      </View>
    );
  }

  // 🔥 Toujours retourner <Slot /> à la fin
  return <Slot />;
}

export default function RootLayout() {
  return (
    <UserProvider>
      <NotificationProvider>
        <RootContent />
      </NotificationProvider>
    </UserProvider>
  );
}
