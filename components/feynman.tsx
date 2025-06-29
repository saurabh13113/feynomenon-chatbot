'use client'

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Brain, Target, TrendingUp, Check, Award, ChevronRight, 
  Plus, Search, Moon, Sun, User, LogOut, Menu, X, MessageSquare,
  Clock, Trash2, Edit3, Settings, Home, BarChart3, Mic, MicOff,
  Volume2, VolumeX, Phone, PhoneOff, Sparkles, Zap
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Study {
  id: string;
  title: string;
  subject: string;
  lastActive: Date;
  progress: number;
  questionsAnswered: number;
  difficulty: number;
}

interface StudyGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  studies: Study[];
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const FeynmanApp: React.FC = () => {
  // Hydration state
  const [mounted, setMounted] = useState<boolean>(false);

  // Auth & User State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // UI State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<'chat' | 'dashboard'>('chat');

  // Study State
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [activeStudy, setActiveStudy] = useState<Study | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({}); // Store messages for each study
  const [sessionIdMap, setSessionIdMap] = useState<Record<string, string>>({}); // Store session ID for each study
  const messageIdRef = useRef<number>(0); // Ref for unique message IDs
  const [inputValue, setInputValue] = useState<string>('');
  
  // Voice Chat State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [synthesis, setSynthesis] = useState<SpeechSynthesis | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);
  const [selectedVoice, setSelectedVoice] = useState<string>('female');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [lastSpokenMessageId, setLastSpokenMessageId] = useState<string | null>(null);
  
  // Backend Integration State
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitializingStudy, setIsInitializingStudy] = useState<boolean>(false);

  // Backend API Configuration
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Helper function to generate unique message IDs
  const generateMessageId = (): string => {
    messageIdRef.current += 1;
    return `msg_${Date.now()}_${messageIdRef.current}`;
  };

  useEffect(() => {
    // Prevent hydration mismatch
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run after component is mounted (client-side only)
    if (!mounted) return;
    
    // Check for existing auth (client-side only)
    try {
      const savedUser = localStorage.getItem('feynman_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      }

      // Check for dark mode preference
      const savedTheme = localStorage.getItem('feynman_theme');
      if (savedTheme === 'dark') {
        setIsDarkMode(true);
      }

      // Check voice preferences
      const savedVoiceEnabled = localStorage.getItem('feynman_voice_enabled');
      if (savedVoiceEnabled === 'false') {
        setVoiceEnabled(false);
      }

      const savedAutoSpeak = localStorage.getItem('feynman_auto_speak');
      if (savedAutoSpeak === 'false') {
        setAutoSpeak(false);
      }

      const savedVoiceGender = localStorage.getItem('feynman_voice_gender');
      if (savedVoiceGender) {
        setSelectedVoice(savedVoiceGender);
      }
      
      // Initialize voice features
      initializeVoiceFeatures();
      
      // Check backend health
      checkBackendHealth();
    } catch (error) {
      console.log('localStorage not available');
    }
  }, [mounted]);

  // Voice Features
  const initializeVoiceFeatures = () => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
      };
      
      recognitionInstance.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };
      
      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Speech recognized:', transcript);
        setInputValue(transcript);
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        alert(`Speech recognition error: ${event.error}. Please check your microphone permissions.`);
      };
      
      setRecognition(recognitionInstance);
    } else {
      console.warn('Speech recognition not supported in this browser');
    }

    // Initialize Speech Synthesis
    if ('speechSynthesis' in window) {
      setSynthesis(window.speechSynthesis);
      
      // Load available voices
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        console.log('Available voices:', voices.length);
      };
      
      // Load voices immediately and on voiceschanged event
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    } else {
      console.warn('Speech synthesis not supported in this browser');
    }
  };

  const getSelectedVoiceObject = (): SpeechSynthesisVoice | null => {
    if (availableVoices.length === 0) return null;
    
    // Filter voices by gender preference
    const femaleVoices = availableVoices.filter(voice => 
      voice.name.toLowerCase().includes('female') || 
      voice.name.toLowerCase().includes('woman') ||
      voice.name.toLowerCase().includes('zira') ||
      voice.name.toLowerCase().includes('susan') ||
      voice.name.toLowerCase().includes('karen') ||
      voice.name.toLowerCase().includes('samantha')
    );
    
    const maleVoices = availableVoices.filter(voice => 
      voice.name.toLowerCase().includes('male') || 
      voice.name.toLowerCase().includes('man') ||
      voice.name.toLowerCase().includes('david') ||
      voice.name.toLowerCase().includes('mark') ||
      voice.name.toLowerCase().includes('alex')
    );
    
    if (selectedVoice === 'female' && femaleVoices.length > 0) {
      return femaleVoices[0];
    } else if (selectedVoice === 'male' && maleVoices.length > 0) {
      return maleVoices[0];
    }
    
    // Fallback to first available voice
    return availableVoices[0] || null;
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      alert('Microphone access is required for voice input. Please allow microphone access and try again.');
      return false;
    }
  };

  const startVoiceInput = async () => {
    if (!recognition || isListening || !voiceEnabled) return;
    
    // Request microphone permission first
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) return;
    
    try {
      console.log('Starting speech recognition...');
      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      alert('Unable to start speech recognition. Please try again.');
    }
  };

  const stopVoiceInput = () => {
    if (recognition && isListening) {
      console.log('Stopping speech recognition...');
      recognition.stop();
    }
  };

  const speakText = (text: string, forceSpeak: boolean = false, messageId?: string) => {
    if (!synthesis || !voiceEnabled) return;
    if (!forceSpeak && !autoSpeak) return;
    
    console.log('Speaking text:', text.substring(0, 50) + '...');
    
    // Stop any current speech
    synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice based on selection
    const selectedVoiceObj = getSelectedVoiceObject();
    if (selectedVoiceObj) {
      utterance.voice = selectedVoiceObj;
      console.log('Using voice:', selectedVoiceObj.name);
    }
    
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    utterance.onstart = () => {
      console.log('Speech started');
      setIsSpeaking(true);
      if (messageId) {
        setLastSpokenMessageId(messageId);
      }
    };
    
    utterance.onend = () => {
      console.log('Speech ended');
      setIsSpeaking(false);
      setLastSpokenMessageId(null);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech error:', event);
      setIsSpeaking(false);
      setLastSpokenMessageId(null);
    };
    
    synthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthesis) {
      console.log('Stopping speech');
      synthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleVoiceGender = () => {
    const newGender = selectedVoice === 'female' ? 'male' : 'female';
    setSelectedVoice(newGender);
    localStorage.setItem('feynman_voice_gender', newGender);
    console.log('Voice gender changed to:', newGender);
  };

  const toggleVoiceEnabled = () => {
    const newValue = !voiceEnabled;
    setVoiceEnabled(newValue);
    localStorage.setItem('feynman_voice_enabled', newValue.toString());
    
    if (!newValue) {
      stopSpeaking();
      stopVoiceInput();
    }
    
    console.log('Voice enabled:', newValue);
  };

  const toggleAutoSpeak = () => {
    const newValue = !autoSpeak;
    setAutoSpeak(newValue);
    localStorage.setItem('feynman_auto_speak', newValue.toString());
    
    if (!newValue) {
      stopSpeaking();
    }
    
    console.log('Auto-speak:', newValue);
  };

  // API Integration Functions
  const sendMessageToBackend = async (message: string, forceNewSession: boolean = false): Promise<any> => {
    try {
      setIsLoading(true);
      
      // Get the correct session ID for the active study
      let sessionIdToUse = null;
      if (activeStudy) {
        if (forceNewSession) {
          // Force new session - don't use existing session ID
          sessionIdToUse = null;
          console.log(`Forcing new session for study: ${activeStudy.title}`);
        } else {
          // Use existing session ID for this study, or null if none exists
          sessionIdToUse = sessionIdMap[activeStudy.id] || null;
          console.log(`Using existing session ID for study: ${activeStudy.title}, sessionId: ${sessionIdToUse}`);
        }
      }
      
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          session_id: sessionIdToUse
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update session ID map if new session was created
      if (data.session_id && activeStudy) {
        console.log(`New session created for study: ${activeStudy.title}, sessionId: ${data.session_id}`);
        setSessionIdMap(prev => ({
          ...prev,
          [activeStudy.id]: data.session_id
        }));
      }
      
      return data;
    } catch (error) {
      console.error('Backend API error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      setIsConnected(response.ok);
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      setIsConnected(false);
      return false;
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('feynman_theme', newMode ? 'dark' : 'light');
    }
  };

  const handleLogin = async (name: string, email: string) => {
    // For now, keep simple frontend auth
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
    };
    
    setUser(newUser);
    setIsAuthenticated(true);
    setShowLoginModal(false);
    
    // Save user to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('feynman_user', JSON.stringify(newUser));
    }
    
    // Check backend connection
    checkBackendHealth();
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('feynman_user');
    }
  };

  const determineSubject = (topic: string): string => {
    const subjectKeywords = {
      'Physics': ['physics', 'quantum', 'mechanics', 'thermodynamics', 'energy', 'force'],
      'Biology': ['biology', 'cell', 'dna', 'evolution', 'organism', 'photosynthesis'],
      'Mathematics': ['math', 'calculus', 'algebra', 'geometry', 'statistics', 'equation'],
      'Chemistry': ['chemistry', 'molecule', 'reaction', 'element', 'compound'],
      'Computer Science': ['programming', 'algorithm', 'data structure', 'computer', 'code'],
      'Economics': ['economics', 'market', 'supply', 'demand', 'finance', 'trade']
    };

    const topicLower = topic.toLowerCase();
    
    for (const [subject, keywords] of Object.entries(subjectKeywords)) {
      if (keywords.some(keyword => topicLower.includes(keyword))) {
        return subject;
      }
    }
    
    return 'General';
  };

  const getSubjectIcon = (subject: string): string => {
    const icons: Record<string, string> = {
      'Physics': '⚛️',
      'Biology': '🧬',
      'Mathematics': '📐',
      'Chemistry': '🧪',
      'Computer Science': '💻',
      'Economics': '📊',
      'General': '📚'
    };
    return icons[subject] || '📚';
  };

  const getSubjectColor = (subject: string): string => {
    const colors: Record<string, string> = {
      'Physics': 'blue',
      'Biology': 'green',
      'Mathematics': 'purple',
      'Chemistry': 'orange',
      'Computer Science': 'indigo',
      'Economics': 'red',
      'General': 'gray'
    };
    return colors[subject] || 'gray';
  };

  const startNewStudy = async (topic: string) => {
    if (!user) return;
    
    // Create new study session
    const newStudy: Study = {
      id: Date.now().toString(),
      title: topic,
      subject: determineSubject(topic),
      lastActive: new Date(),
      progress: 0,
      questionsAnswered: 0,
      difficulty: 1
    };

    // Add to study groups
    setStudyGroups(prev => {
      const subject = newStudy.subject;
      const existingGroupIndex = prev.findIndex(group => group.name === subject);

      if (existingGroupIndex >= 0) {
        const updated = [...prev];
        updated[existingGroupIndex].studies.unshift(newStudy);
        return updated;
      } else {
        const newGroup: StudyGroup = {
          id: subject.toLowerCase(),
          name: subject,
          icon: getSubjectIcon(subject),
          color: getSubjectColor(subject),
          studies: [newStudy]
        };
        return [newGroup, ...prev];
      }
    });

    // Save current messages to map if there's an active study
    if (activeStudy) {
      setMessagesMap(prev => ({
        ...prev,
        [activeStudy.id]: messages
      }));
    }

    setActiveStudy(newStudy);
    setMessages([]); // Clear messages for new study
    // Don't reset sessionId here - let the backend create a new session
    
    // Send initial message to backend to start learning session
    try {
      const response = await sendMessageToBackend(`I want to learn about ${topic}`, true); // Force new session
      
      if (response && response.response) {
        const aiMessage: Message = {
          id: generateMessageId(),
          type: 'ai',
          content: response.response,
          timestamp: new Date()
        };
        setMessages(prev => [aiMessage]);
        
        // Auto-speak the response
        speakText(response.response, false, aiMessage.id);
        
        // Save initial message to map
        setMessagesMap(prev => ({
          ...prev,
          [newStudy.id]: [aiMessage]
        }));
      }
    } catch (error) {
      console.error('Failed to start study session:', error);
      // Fallback message if backend is unavailable
      const fallbackMessage: Message = {
        id: generateMessageId(),
        type: 'ai',
        content: `Great! Let's start learning about "${topic}". I'll use the Feynman Technique to help you master this concept. Can you begin by explaining what you already know about this topic in simple terms?`,
        timestamp: new Date()
      };
      setMessages([fallbackMessage]);
      
      // Auto-speak fallback response
      speakText(fallbackMessage.content, false, fallbackMessage.id);
      
      // Save fallback message to map
      setMessagesMap(prev => ({
        ...prev,
        [newStudy.id]: [fallbackMessage]
      }));
    }
  };

  const switchToStudy = (study: Study) => {
    console.log(`Switching to study: ${study.title}, existing sessionId: ${sessionIdMap[study.id]}`);
    
    // Save current messages to map if there's an active study
    if (activeStudy) {
      setMessagesMap(prev => ({
        ...prev,
        [activeStudy.id]: messages
      }));
    }
    
    setActiveStudy(study);
    // Load messages for the selected study, or empty array if none exist
    setMessages(messagesMap[study.id] || []);
    // Don't clear session ID - use the existing session ID for this study
    // The backend will continue the same conversation for this study
    
    // If this study doesn't have a session ID yet, initialize it
    if (!sessionIdMap[study.id] && messagesMap[study.id]?.length === 0) {
      console.log(`Initializing new session for study: ${study.title}`);
      continueStudySession(study);
    }
  };

  const continueStudySession = async (study: Study) => {
    // If this study doesn't have a session ID yet, create one by sending an initial message
    if (!sessionIdMap[study.id] && messagesMap[study.id]?.length === 0) {
      setIsInitializingStudy(true);
      try {
        const response = await sendMessageToBackend(`I want to continue learning about ${study.title}`, true);
        if (response && response.response) {
          const aiMessage: Message = {
            id: generateMessageId(),
            type: 'ai',
            content: response.response,
            timestamp: new Date()
          };
          setMessages([aiMessage]);
          setMessagesMap(prev => ({
            ...prev,
            [study.id]: [aiMessage]
          }));
          
          // Auto-speak the response
          speakText(response.response, false, aiMessage.id);
        }
      } catch (error) {
        console.error('Failed to continue study session:', error);
      } finally {
        setIsInitializingStudy(false);
      }
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !activeStudy) return;

    const userMessage: Message = {
      id: generateMessageId(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      
      // Save messages to map for current study
      if (activeStudy) {
        setMessagesMap(prevMap => ({
          ...prevMap,
          [activeStudy.id]: newMessages
        }));
      }
      
      return newMessages;
    });
    const currentInput = inputValue;
    setInputValue('');

    try {
      // Send message to your friend's backend
      const response = await sendMessageToBackend(currentInput);
      
      if (response && response.response) {
        const aiMessage: Message = {
          id: generateMessageId(),
          type: 'ai',
          content: response.response,
          timestamp: new Date()
        };
        setMessages(prev => {
          const newMessages = [...prev, aiMessage];
          
          // Save messages to map for current study
          if (activeStudy) {
            setMessagesMap(prevMap => ({
              ...prevMap,
              [activeStudy.id]: newMessages
            }));
          }
          
          return newMessages;
        });
        
        // Auto-speak AI responses
        speakText(response.response, false, aiMessage.id);
        
        // Update study progress based on backend response
        if (response.phase && activeStudy) {
          const updatedStudy = {
            ...activeStudy,
            lastActive: new Date(),
            questionsAnswered: activeStudy.questionsAnswered + 1,
            progress: response.phase === 'feynman_tutoring' ? 
              Math.min(activeStudy.progress + 10, 100) : activeStudy.progress
          };
          setActiveStudy(updatedStudy);
          
          // Update in study groups
          setStudyGroups(prev => 
            prev.map(group => ({
              ...group,
              studies: group.studies.map(study => 
                study.id === activeStudy.id ? updatedStudy : study
              )
            }))
          );
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Fallback response if backend is unavailable
      const fallbackMessage: Message = {
        id: generateMessageId(),
        type: 'ai',
        content: isConnected ? 
          "I'm having trouble processing your response right now. Please try again in a moment." :
          "I'm currently offline. Your message has been saved and I'll respond when the connection is restored.",
        timestamp: new Date()
      };
      setMessages(prev => {
        const newMessages = [...prev, fallbackMessage];
        
        // Save messages to map for current study
        if (activeStudy) {
          setMessagesMap(prevMap => ({
            ...prevMap,
            [activeStudy.id]: newMessages
          }));
        }
        
        return newMessages;
      });
      
      // Auto-speak fallback response
      speakText(fallbackMessage.content, false, fallbackMessage.id);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className={`flex items-center space-x-2 text-xs ${
      isDarkMode ? 'text-gray-400' : 'text-gray-600'
    }`}>
      <div className={`w-2 h-2 rounded-full animate-pulse ${
        isConnected ? 'bg-green-500' : 'bg-red-500'
      }`} />
      <span>{isConnected ? 'AI Connected' : 'AI Offline'}</span>
    </div>
  );

  const VoiceControls = () => (
    <div className="flex items-center space-x-2">
      <button
        onClick={toggleVoiceEnabled}
        className={`p-2 rounded-lg transition-all ${
          voiceEnabled 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' 
            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
        }`}
        title={voiceEnabled ? 'Voice enabled' : 'Voice disabled'}
      >
        {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>
      
      <button
        onClick={toggleAutoSpeak}
        disabled={!voiceEnabled}
        className={`p-2 rounded-lg transition-all ${
          autoSpeak && voiceEnabled
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' 
            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={autoSpeak ? 'Auto-speak enabled' : 'Auto-speak disabled'}
      >
        <Sparkles className="w-4 h-4" />
      </button>

      
    </div>
  );

  const LoginModal = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className={`${
          isDarkMode ? 'bg-gray-800/90' : 'bg-white/90'
        } backdrop-blur-md rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-full">
                <Brain className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Welcome to FeynmanAI
            </h2>
            <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Master any concept through AI-powered adaptive questioning
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full p-3 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm`}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full p-3 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm`}
                placeholder="Enter your email"
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => setShowLoginModal(false)}
                className={`flex-1 py-3 px-4 rounded-lg border ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700/50' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50/50'
                } transition-colors backdrop-blur-sm`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleLogin(name, email)}
                disabled={!name || !email}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-full mb-6 mx-auto w-fit">
            <Brain className="w-12 h-12 text-white animate-pulse" />
          </div>
          <p className="text-gray-600 animate-pulse">Loading FeynmanAI...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen ${
        isDarkMode 
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900' 
          : 'bg-gradient-to-br from-indigo-50 via-white to-purple-50'
      } flex items-center justify-center`}>
        <div className="text-center">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-full mb-6 mx-auto w-fit animate-bounce">
            <Brain className="w-16 h-16 text-white" />
          </div>
          <h1 className={`text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent`}>
            FeynmanAI
          </h1>
          <p className={`text-xl mb-8 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Master any concept through AI-powered adaptive questioning
          </p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-xl"
          >
            <span className="flex items-center">
              Get Started
              <Zap className="w-5 h-5 ml-2" />
            </span>
          </button>
        </div>
        {showLoginModal && <LoginModal />}
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900' 
        : 'bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50'
    }`}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden ${
        isDarkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-200'
      } border-r flex flex-col backdrop-blur-md`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-lg mr-3">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h1 className={`text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent`}>
                FeynmanAI
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <VoiceControls />
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                } transition-colors`}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>
          
          <button
            onClick={() => {
              // Save current messages to map if there's an active study
              if (activeStudy) {
                setMessagesMap(prev => ({
                  ...prev,
                  [activeStudy.id]: messages
                }));
              }
              setActiveStudy(null);
              setMessages([]);
              setCurrentView('chat');
            }}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center shadow-lg transform hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Study Session
          </button>
        </div>

        {/* Study Groups */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {studyGroups.map((group) => (
              <div key={group.id}>
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-2">{group.icon}</span>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {group.name}
                  </h3>
                  <span className={`ml-auto text-sm px-2 py-1 rounded-full ${
                    isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {group.studies.length}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {group.studies.map((study) => (
                    <div
                      key={study.id}
                      onClick={() => switchToStudy(study)}
                      className={`p-3 rounded-xl cursor-pointer transition-all transform hover:scale-105 ${
                        activeStudy?.id === study.id
                          ? 'bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 border-l-4 border-indigo-600 shadow-lg'
                          : isDarkMode 
                            ? 'hover:bg-gray-700/50 hover:shadow-lg' 
                            : 'hover:bg-gray-50 hover:shadow-lg'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={`font-medium text-sm ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        } truncate`}>
                          {study.title}
                        </h4>
                        <Clock className={`w-4 h-4 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`} />
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                          {formatTime(study.lastActive)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          study.progress > 60 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                            : study.progress > 30
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                        }`}>
                          {study.progress}%
                        </span>
                      </div>
                      
                      <div className={`mt-2 h-2 rounded-full ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                      } overflow-hidden`}>
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${study.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Profile */}
        <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <ConnectionStatus />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="ml-3">
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user?.name}
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={`p-2 rounded-lg ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              } transition-colors`}
            >
              <LogOut className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={`p-4 border-b ${
          isDarkMode ? 'border-gray-700 bg-gray-800/90' : 'border-gray-200 bg-white/90'
        } flex items-center justify-between backdrop-blur-md`}>
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-lg mr-3 ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              } transition-colors`}
            >
              <Menu className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
            
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {activeStudy ? activeStudy.title : 'Start a New Study Session'}
            </h2>
          </div>
          
          {activeStudy && (
            <div className="flex items-center space-x-4">
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Difficulty Level {activeStudy.difficulty}/5
              </div>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`w-3 h-3 rounded-full transition-all ${
                      level <= activeStudy.difficulty 
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500' 
                        : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {!activeStudy ? (
            // Welcome Screen
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-2xl">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-full mb-6 mx-auto w-fit">
                  <Brain className="w-16 h-16 text-white" />
                </div>
                <h2 className={`text-3xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent`}>
                  What would you like to learn today?
                </h2>
                <p className={`text-lg mb-8 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Start by telling me what concept you would like to master using the Feynman Technique
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {['Quantum Physics', 'Machine Learning', 'Calculus', 'Cell Biology', 'Economics', 'Chemistry'].map((topic) => (
                    <button
                      key={topic}
                      onClick={() => startNewStudy(topic)}
                      className={`p-4 rounded-xl border-2 border-dashed transition-all transform hover:scale-105 ${
                        isDarkMode 
                          ? 'border-gray-600 hover:border-indigo-500 hover:bg-gray-800/50 text-white' 
                          : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 text-gray-900'
                      } backdrop-blur-sm hover:shadow-lg`}
                    >
                      <span className="font-medium">{topic}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Messages
            <div className="space-y-4 max-w-4xl mx-auto">
              {isInitializingStudy && (
                <div className="flex justify-start">
                  <div className={`max-w-3xl p-4 rounded-2xl backdrop-blur-sm ${
                    isDarkMode
                      ? 'bg-gray-800/90 text-white'
                      : 'bg-white/90 text-gray-900 shadow-sm border'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm">Initializing study session...</p>
                    </div>
                  </div>
                </div>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} transform transition-all duration-300 hover:scale-105`}
                >
                  <div className={`max-w-3xl p-4 rounded-2xl backdrop-blur-sm shadow-lg ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                      : isDarkMode
                        ? 'bg-gray-800/90 text-white border border-gray-700'
                        : 'bg-white/90 text-gray-900 border border-gray-200'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className={`text-xs ${
                        message.type === 'user' 
                          ? 'text-indigo-200' 
                          : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                      {message.type === 'ai' && voiceEnabled && (
                        <button
                          onClick={() => speakText(message.content, true, message.id)} // Force speak regardless of auto-speak
                          disabled={isSpeaking && lastSpokenMessageId === message.id}
                          className={`ml-2 p-1 rounded transition-colors hover:scale-110 ${
                            isSpeaking && lastSpokenMessageId === message.id
                              ? 'text-orange-500 animate-pulse' 
                              : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                          } disabled:cursor-not-allowed`}
                          title="Speak this message"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={`p-4 border-t ${
          isDarkMode ? 'border-gray-700 bg-gray-800/90' : 'border-gray-200 bg-white/90'
        } backdrop-blur-md`}>
          <div className="max-w-4xl mx-auto">
            <div className="flex space-x-3">
              {/* Voice Input Button */}
              {voiceEnabled && recognition && (
                <button
                  onClick={isListening ? stopVoiceInput : startVoiceInput}
                  disabled={isLoading || isInitializingStudy}
                  className={`p-4 rounded-xl transition-all transform hover:scale-105 ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-lg' 
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg'
                  } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                  title={isListening ? 'Stop recording' : 'Start voice input'}
                >
                  {isListening ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
              )}

              <button
              onClick={toggleVoiceGender}
              disabled={!voiceEnabled}
              className={`p-2 rounded-lg transition-all ${
                voiceEnabled
                  ? selectedVoice === 'female'
                    ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400'
                    : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={`Voice: ${selectedVoice === 'female' ? 'Female' : 'Male'}`}
            >
              <User className="w-4 h-4" />
              <span className="text-xs ml-1">{selectedVoice === 'female' ? '♀' : '♂'}</span>
             </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && !isInitializingStudy && sendMessage()}
                disabled={isLoading || isInitializingStudy}
                placeholder={
                  activeStudy 
                    ? "Explain your understanding or ask a question..." 
                    : "What would you like to learn about?"
                }
                className={`flex-1 p-4 rounded-xl border backdrop-blur-sm ${
                  isDarkMode 
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 transition-all`}
              />

              {/* Voice Output Control */}
              {voiceEnabled && synthesis && (
                <button
                  onClick={() => {
                    if (isSpeaking) {
                      stopSpeaking();
                    } else {
                      // Speak the last AI message if any
                      const lastAiMessage = messages.slice().reverse().find(m => m.type === 'ai');
                      if (lastAiMessage) {
                        speakText(lastAiMessage.content, true, lastAiMessage.id);
                      }
                    }
                  }}
                  className={`p-4 rounded-xl transition-all transform hover:scale-105 ${
                    isSpeaking 
                      ? 'bg-orange-500 hover:bg-orange-600 text-white animate-pulse shadow-lg' 
                      : messages.some(m => m.type === 'ai')
                        ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title={isSpeaking ? 'Stop speaking' : 'Speak last AI message'}
                  disabled={!messages.some(m => m.type === 'ai') && !isSpeaking}
                >
                  {isSpeaking ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
              )}

              {/* Send Button */}
              <button
                onClick={() => {
                  if (activeStudy) {
                    sendMessage();
                  } else {
                    startNewStudy(inputValue);
                  }
                }}
                disabled={!inputValue.trim() || isLoading || isInitializingStudy}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center min-w-[56px] transform hover:scale-105 shadow-lg disabled:transform-none"
              >
                {isLoading || isInitializingStudy ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Voice Status Indicator */}
            {(isListening || isSpeaking) && (
              <div className="mt-3 text-center">
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm backdrop-blur-sm shadow-lg ${
                  isListening 
                    ? 'bg-red-100/90 text-red-700 dark:bg-red-900/50 dark:text-red-400 border border-red-200 dark:border-red-800' 
                    : 'bg-orange-100/90 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
                }`}>
                  {isListening ? (
                    <>
                      <Mic className="w-4 h-4 animate-pulse" />
                      <span className="font-medium">Listening... (Speak now)</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 animate-pulse" />
                      <span className="font-medium">Speaking... ({selectedVoice} voice)</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Voice Debug Info (only in development) */}
            {voiceEnabled && process.env.NODE_ENV === 'development' && (
              <div className="mt-2 text-center">
                <div className="text-xs text-gray-500">
                  Voice: {selectedVoice} | Voices: {availableVoices.length} | 
                  Recognition: {recognition ? '✓' : '✗'} | 
                  Synthesis: {synthesis ? '✓' : '✗'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeynmanApp;