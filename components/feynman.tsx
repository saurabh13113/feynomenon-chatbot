'use client'

import React, { useState } from 'react';
import { BookOpen, Brain, Target, TrendingUp, Check, Award, ChevronRight } from 'lucide-react';

interface Topic {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface Progress {
  questionsAnswered: number;
  mistakeAreas: string[];
  strengths: string[];
}

const FeynmanApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'learning'>('home');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [difficulty, setDifficulty] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [progress, setProgress] = useState<Progress>({
    questionsAnswered: 0,
    mistakeAreas: ['Photosynthesis process', 'Newton\'s laws'],
    strengths: ['Basic concepts', 'Problem solving']
  });

  const topics: Topic[] = [
    { id: 'physics', name: 'Physics', icon: '⚛️', description: 'Classical mechanics, thermodynamics, electromagnetism' },
    { id: 'biology', name: 'Biology', icon: '🧬', description: 'Cell biology, genetics, evolution, ecology' },
    { id: 'chemistry', name: 'Chemistry', icon: '🧪', description: 'Organic, inorganic, physical chemistry' },
    { id: 'math', name: 'Mathematics', icon: '📐', description: 'Algebra, calculus, statistics, geometry' },
    { id: 'cs', name: 'Computer Science', icon: '💻', description: 'Algorithms, data structures, programming' },
    { id: 'economics', name: 'Economics', icon: '📊', description: 'Micro/macroeconomics, market theory' }
  ];

  const sampleQuestions: Record<number, string> = {
    1: "Explain what photosynthesis is in simple terms.",
    2: "How does the light-dependent reaction differ from the Calvin cycle in photosynthesis?",
    3: "Why would photosynthesis be affected differently in C3 vs C4 plants under high temperature stress?",
    4: "Design an experiment to test how atmospheric CO2 concentration affects photosynthetic efficiency in marine phytoplankton.",
    5: "Analyze the evolutionary trade-offs between photosynthetic efficiency and photorespiration in terrestrial plants."
  };

  const getDifficultyColor = (level: number): string => {
    const colors: Record<number, string> = {
      1: 'bg-green-500',
      2: 'bg-blue-500',
      3: 'bg-yellow-500',
      4: 'bg-orange-500',
      5: 'bg-red-500'
    };
    return colors[level] || 'bg-gray-500';
  };

  const getDifficultyLabel = (level: number): string => {
    const labels: Record<number, string> = {
      1: 'Basic Understanding',
      2: 'Detailed Knowledge',
      3: 'Application',
      4: 'Analysis',
      5: 'Expert Level'
    };
    return labels[level] || 'Unknown';
  };

  const startLearning = (topicId: string): void => {
    setSelectedTopic(topicId);
    setCurrentView('learning');
    setDifficulty(1);
    setCurrentQuestion(sampleQuestions[1]);
    setUserAnswer('');
    setShowFeedback(false);
  };

  const submitAnswer = (): void => {
    // Simulate AI feedback
    const isGood = userAnswer.length > 20; // Simple simulation
    setFeedback(isGood ? 
      "Great explanation! You demonstrated clear understanding. Let's move to a more challenging question." :
      "Good start! Try to explain the process step-by-step. Think about what happens to light energy and how it becomes chemical energy."
    );
    setShowFeedback(true);
    
    if (isGood) {
      setScore(score + difficulty * 10);
      setStreak(streak + 1);
      if (difficulty < 5) {
        setDifficulty(difficulty + 1);
      }
    } else {
      setStreak(0);
    }
    
    setProgress(prev => ({
      ...prev,
      questionsAnswered: prev.questionsAnswered + 1
    }));
  };

  const nextQuestion = (): void => {
    setCurrentQuestion(sampleQuestions[difficulty] || "Loading next question...");
    setUserAnswer('');
    setShowFeedback(false);
  };

  const renderHome = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Brain className="w-12 h-12 text-indigo-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">FeynmanAI</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Master any concept through AI-powered adaptive questioning. Learn by explaining, grow through mistakes.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Score</p>
                <p className="text-2xl font-bold text-indigo-600">{score}</p>
              </div>
              <Award className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Current Streak</p>
                <p className="text-2xl font-bold text-green-600">{streak}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Questions Answered</p>
                <p className="text-2xl font-bold text-purple-600">{progress.questionsAnswered}</p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Topic Selection */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Choose Your Learning Topic</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => startLearning(topic.id)}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:scale-105 border-2 border-transparent hover:border-indigo-200"
              >
                <div className="text-center">
                  <div className="text-4xl mb-3">{topic.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{topic.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{topic.description}</p>
                  <div className="flex items-center justify-center text-indigo-600 font-medium">
                    Start Learning <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Insights */}
        {progress.questionsAnswered > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-red-500" />
                Areas to Improve
              </h3>
              <div className="space-y-2">
                {progress.mistakeAreas.map((area, index) => (
                  <div key={index} className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
                    {area}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Check className="w-5 h-5 mr-2 text-green-500" />
                Your Strengths
              </h3>
              <div className="space-y-2">
                {progress.strengths.map((strength, index) => (
                  <div key={index} className="bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm">
                    {strength}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderLearning = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => setCurrentView('home')}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            ← Back to Topics
          </button>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Score</p>
              <p className="text-xl font-bold text-purple-600">{score}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Streak</p>
              <p className="text-xl font-bold text-green-600">{streak}</p>
            </div>
          </div>
        </div>

        {/* Difficulty Indicator */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Current Difficulty</h3>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`w-4 h-4 rounded ${
                    level <= difficulty ? getDifficultyColor(difficulty) : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-gray-600">{getDifficultyLabel(difficulty)}</p>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl p-8 shadow-lg mb-6">
          <div className="flex items-center mb-4">
            <BookOpen className="w-6 h-6 text-indigo-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-800">Explain This Concept</h2>
          </div>
          <div className="bg-indigo-50 rounded-lg p-6 mb-6">
            <p className="text-lg text-gray-800">{currentQuestion}</p>
          </div>
          
          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your explanation here... Remember the Feynman Technique: explain it simply, as if teaching a friend!"
            className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            disabled={showFeedback}
          />
          
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-gray-500">
              Characters: {userAnswer.length} (Aim for detailed explanations)
            </p>
            {!showFeedback ? (
              <button
                onClick={submitAnswer}
                disabled={userAnswer.length < 10}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={nextQuestion}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                Next Question <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            )}
          </div>
        </div>

        {/* Feedback */}
        {showFeedback && (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center mb-3">
              <Brain className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">AI Feedback</h3>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-gray-700">{feedback}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return currentView === 'home' ? renderHome() : renderLearning();
};

export default FeynmanApp;