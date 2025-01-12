import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Linking,
  Keyboard
} from 'react-native';
import axios from 'axios';
import { useRoute } from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';
import Autolink from 'react-native-autolink';

// Define interfaces for messages and user
interface Message {
  sender: string;
  message: string;
}

type User = {
  _id: string;
  name: string;
  familyName: string;
  tel: string;
  email: string;
  password: string;
  role: string;
  language: string;
  dsp_code: string;
  conversation: string;
  expoPushToken?: string;
};

// Rasa server URL
const rasaServerUrl = "http://138.197.172.64:5005/webhooks/rest/webhook";

const Dispatche = () => {
  const route = useRoute();
  const { user } = route.params as { user: User };
  const [messages, setMessages] = useState<Message[]>([]);
  const [userMessage, setUserMessage] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null); // Reference for FlatList

  // Scroll to the latest message
  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Function to preprocess messages (replace escaped newlines with real ones)
  const preprocessMessage = (message: string): string => {
    return message.replace(/\\n/g, '\n');
  };

  const sendMessageToRasa = async () => {
    if (!userMessage.trim() || isTyping) return;

    // Ferme le clavier
    Keyboard.dismiss();

    // Ajouter le message utilisateur à l'historique local
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: 'user', message: userMessage },
    ]);

    setIsTyping(true);

    try {
      const response = await axios.post(rasaServerUrl, {
        sender: user.name,
        message: userMessage,
      });

      const botResponses = response.data;

      if (botResponses.length === 0) {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            sender: 'bot',
            message:
              user.language === 'English'
                ? "I didn't understand your question. Please rephrase it."
                : "Je n'ai pas compris votre question. Veuillez la reformuler.",
          },
        ]);
      } else {
        botResponses.forEach((botResponse: { text?: string }) => {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              sender: 'bot',
              message: preprocessMessage(botResponse.text || "Message non disponible"),
            },
          ]);
        });
      }
    } catch (error) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'bot', message: "Erreur de connexion avec le serveur." },
      ]);
    }

    setUserMessage('');
    setIsTyping(false);
  };




  useEffect(() => {
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        sender: 'bot',
        message:
          user.language === 'English'
            ? `Hello, ${user.name} ${user.familyName}. I'm your virtual assistant. How can I help you today?`
            : `Bonjour, ${user.name} ${user.familyName}. Je suis votre assistant virtuel. Comment puis-je vous aider aujourd'hui?`,
      },
    ]);
  }, [user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {user.language === 'English' ? 'Virtual Dispatch' : 'Dispatch Virtuel'}
      </Text>

      <View style={styles.conversationContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => {
            const isUserMessage = item.sender === 'user';

            return (
              <View
                style={[
                  styles.messageContainer,
                  isUserMessage && styles.userMessageContainer,
                ]}
              >
                {item.sender === 'bot' ? (
                  <Markdown
                    style={markdownStyles}
                    onLinkPress={(url) => {
                      Linking.openURL(url).catch((err) =>
                        console.error("Failed to open URL:", err)
                      );
                      return true;
                    }}
                  >
                    {item.message}
                  </Markdown>
                ) : (
                  <Autolink
                    text={item.message}
                    style={styles.userText}
                    linkStyle={{ color: 'blue', textDecorationLine: 'underline' }}
                    onPress={(url) => Linking.openURL(url)}
                  />
                )}
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {isTyping && (
          <View style={styles.typingContainer}>
            <ActivityIndicator size="small" color="#001933" />
            <Text style={styles.typingText}>
              {user.language === 'English'
                ? 'Assistant is typing...'
                : "L'assistant tape..."}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { height: Math.min(inputHeight, 100) }]}
          value={userMessage}
          onChangeText={setUserMessage}
          placeholder={
            user.language === 'English'
              ? 'Type your message here...'
              : 'Tapez votre message ici...'
          }
          placeholderTextColor="#ccc"
          multiline
          onContentSizeChange={(event) =>
            setInputHeight(event.nativeEvent.contentSize.height)
          }
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={sendMessageToRasa}
          disabled={isTyping}
        >
          <Text
            style={[
              styles.sendButtonText,
              isTyping && styles.disabledButtonText,
            ]}
          >
            {isTyping
              ? user.language === 'English'
                ? 'Typing...'
                : 'En train de taper...'
              : user.language === 'English'
                ? 'Send'
                : 'Envoyer'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Dispatche;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#001933',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
    marginBottom: 10,
  },
  conversationContainer: {
    flex: 1,
    borderColor: '#ffffff',
    borderWidth: 2,
    borderRadius: 15,
    padding: 10,
    backgroundColor: '#fff',
    marginBottom: 30,
  },
  messageContainer: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#001933',
  },
  userText: {
    color: '#fff',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  input: {
    flex: 1,
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#fff',
    color: '#333',
    paddingHorizontal: 10,
  },
  sendButton: {
    backgroundColor: '#00FF00',
    borderRadius: 10,
    padding: 10,
    marginLeft: 10,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  disabledButtonText: {
    color: '#aaa',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    color: '#001933',
    marginLeft: 10,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  strong: {
    fontWeight: 'bold',
  },
  link: {
    color: 'blue',
    textDecorationLine: 'underline',
  },
});
