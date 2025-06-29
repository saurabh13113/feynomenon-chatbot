'use client'

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Brain, Target, TrendingUp, Check, Award, ChevronRight, 
  Plus, Search, Moon, Sun, User, LogOut, Menu, X, MessageSquare,
  Clock, Trash2, Edit3, Settings, Home, BarChart3
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
  const [inputValue, setInputValue] = useState<string>('');
  
  // Backend Integration State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Backend API Configuration
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
      
      // Check backend health
      checkBackendHealth();
    } catch (error) {
      console.log('localStorage not available');
    }
  }, [mounted]);

  // API Integration Functions
  const sendMessageToBackend = async (message: string): Promise<any> => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          session_id: sessionId // Include existing session if available
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update session ID if new session was created
      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
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

    setActiveStudy(newStudy);
    setMessages([]);
    setSessionId(null); // Reset session for new study
    
    // Send initial message to backend to start learning session
    try {
      const response = await sendMessageToBackend(`I want to learn about ${topic}`);
      
      if (response && response.response) {
        const aiMessage: Message = {
          id: '1',
          type: 'ai',
          content: response.response,
          timestamp: new Date()
        };
        setMessages([aiMessage]);
      }
    } catch (error) {
      console.error('Failed to start study session:', error);
      // Fallback message if backend is unavailable
      const fallbackMessage: Message = {
        id: '1',
        type: 'ai',
        content: `Great! Let's start learning about "${topic}". I'll use the Feynman Technique to help you master this concept. Can you begin by explaining what you already know about this topic in simple terms?`,
        timestamp: new Date()
      };
      setMessages([fallbackMessage]);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !activeStudy) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');

    try {
      // Send message to your friend's backend
      const response = await sendMessageToBackend(currentInput);
      
      if (response && response.response) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: response.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        
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
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: isConnected ? 
          "I'm having trouble processing your response right now. Please try again in a moment." :
          "I'm currently offline. Your message has been saved and I'll respond when the connection is restored.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fallbackMessage]);
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
      <div className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-green-500' : 'bg-red-500'
      }`} />
      <span>{isConnected ? 'AI Connected' : 'AI Offline'}</span>
    </div>
  );

  const LoginModal = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-8 max-w-md w-full mx-4`}>
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Welcome to Feynomenon AI
          </h2>
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
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
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
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                placeholder="Enter your email"
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => setShowLoginModal(false)}
                className={`flex-1 py-3 px-4 rounded-lg border ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                } transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleLogin(name, email)}
                disabled={!name || !email}
                className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-indigo-600 mx-auto mb-6 animate-pulse" />
          <p className="text-gray-600">Loading FeynmanAI...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <Brain className="w-16 h-16 text-indigo-600 mx-auto mb-6" />
          <h1 className={`text-4xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Feynmomenon AI
          </h1>
          <p className={`text-xl mb-8 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Master any concept through AI-powered adaptive questioning
          </p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Get Started
          </button>
        </div>
        {showLoginModal && <LoginModal />}
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border-r flex flex-col`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Brain className="w-8 h-8 text-indigo-600 mr-2" />
              <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Feynomenon AI
              </h1>
            </div>
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
          
          <button
            onClick={() => {
              setActiveStudy(null);
              setMessages([]);
              setCurrentView('chat');
            }}
            className="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
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
                  <span className={`ml-auto text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {group.studies.length}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {group.studies.map((study) => (
                    <div
                      key={study.id}
                      onClick={() => setActiveStudy(study)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        activeStudy?.id === study.id
                          ? 'bg-indigo-100 dark:bg-indigo-900/50 border-l-4 border-indigo-600'
                          : isDarkMode 
                            ? 'hover:bg-gray-700' 
                            : 'hover:bg-gray-100'
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
                        <span className={`px-2 py-1 rounded ${
                          study.progress > 60 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                            : study.progress > 30
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                        }`}>
                          {study.progress}%
                        </span>
                      </div>
                      
                      <div className={`mt-2 h-1 rounded-full ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                      }`}>
                        <div 
                          className="h-full bg-indigo-600 rounded-full transition-all"
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
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
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
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        } flex items-center justify-between`}>
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
                    className={`w-3 h-3 rounded ${
                      level <= activeStudy.difficulty 
                        ? 'bg-indigo-600' 
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
                <Brain className="w-16 h-16 text-indigo-600 mx-auto mb-6" />
                <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  What would you like to learn today?
                </h2>
                <p className={`text-lg mb-8 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Start by telling me what concept you'd like to master using the Feynman Technique
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {['Quantum Physics', 'Machine Learning', 'Calculus', 'Cell Biology', 'Economics', 'Chemistry'].map((topic) => (
                    <button
                      key={topic}
                      onClick={() => startNewStudy(topic)}
                      className={`p-4 rounded-lg border-2 border-dashed ${
                        isDarkMode 
                          ? 'border-gray-600 hover:border-indigo-500 hover:bg-gray-800' 
                          : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50'
                      } transition-all`}
                    >
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {topic}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Messages
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-3xl p-4 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-indigo-600 text-white'
                      : isDarkMode
                        ? 'bg-gray-800 text-white'
                        : 'bg-white text-gray-900 shadow-sm border'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-2 ${
                      message.type === 'user' 
                        ? 'text-indigo-200' 
                        : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={`p-4 border-t ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="max-w-4xl mx-auto">
            <div className="flex space-x-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
                disabled={isLoading}
                placeholder={
                  activeStudy 
                    ? "Explain your understanding or ask a question..." 
                    : "What would you like to learn about?"
                }
                className={`flex-1 p-4 rounded-xl border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50`}
              />
              <button
                onClick={() => {
                  if (activeStudy) {
                    sendMessage();
                  } else {
                    startNewStudy(inputValue);
                  }
                }}
                disabled={!inputValue.trim() || isLoading}
                className="bg-indigo-600 text-white p-4 rounded-xl hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[56px]"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeynmanApp;