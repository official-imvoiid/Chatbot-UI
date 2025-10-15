import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, Download, Trash2, Settings, Paperclip, X, Plus, MessageSquare, Sun, Moon, Key, User, LogOut, Mail, Lock, Cpu, Brain, Camera, Edit2, Check } from 'lucide-react';

export default function GGUFChatbot() {
  // Initialize state with memory storage (not localStorage to work in Claude.ai)
  const [currentPage, setCurrentPage] = useState('login');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelName, setModelName] = useState('');
  const [modelType, setModelType] = useState('');
  const [apiKeys, setApiKeys] = useState({ openai: '', claude: '' });
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [selectedApiType, setSelectedApiType] = useState('openai');
  const [darkMode, setDarkMode] = useState(true);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState({
    username: 'Guest User',
    email: 'guest@local.user',
    password: '',
    profilePhoto: null,
    isLoggedIn: false
  });
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [editingProfile, setEditingProfile] = useState(false);
  const [tempProfile, setTempProfile] = useState({...userProfile});
  const [tempApiKey, setTempApiKey] = useState('');
  const [settings, setSettings] = useState({
    temperature: 0.7,
    maxTokens: 512,
    topP: 0.9,
    openaiModel: 'gpt-4o',
    claudeModel: 'claude-3-5-sonnet-20241022'
  });
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingChatTitle, setEditingChatTitle] = useState('');
  const [backendConnected, setBackendConnected] = useState(false);
  const [userDatabase, setUserDatabase] = useState({});

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const modelInputRef = useRef(null);
  const importInputRef = useRef(null);
  const profilePhotoRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if user is guest
  const isGuestUser = () => {
    return userProfile.email === 'guest@local.user' || !userProfile.email;
  };

  // Fix for auto-saving chat history
  useEffect(() => {
    if (messages.length > 0 && userProfile.isLoggedIn && !isGuestUser() && backendConnected) {
      const saveChat = async () => {
        try {
          const firstUserMessage = messages.find(m => m.role === 'user');
          let title = firstUserMessage?.content.substring(0, 30) + 
                     (firstUserMessage?.content.length > 30 ? '...' : '') || 'New Chat';

          // If we have an existing chat, try to preserve its title
          if (currentChatId) {
            const existingChat = chatHistory.find(chat => chat.id === currentChatId);
            if (existingChat && existingChat.title && existingChat.title !== 'New Chat') {
              title = existingChat.title;
            }
          }

          // If we don't have a currentChatId, create a new one
          if (!currentChatId) {
            const newChatId = Date.now().toString();
            setCurrentChatId(newChatId);
            
            const newChat = {
              id: newChatId,
              title: title,
              messages: messages,
              timestamp: new Date().toISOString()
            };

            // Update local state first
            setChatHistory(prev => {
              const exists = prev.some(c => c.id === newChatId);
              if (exists) return prev;
              return [newChat, ...prev];
            });

            // Then save to backend
            await fetch('http://localhost:5001/api/history/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_email: userProfile.email,
                chat_id: newChatId,
                messages: messages,
                title: title
              })
            });
          } else {
            // Update existing chat - preserve the existing title if it's meaningful
            const existingChat = chatHistory.find(chat => chat.id === currentChatId);
            const finalTitle = (existingChat && existingChat.title && existingChat.title !== 'New Chat') 
              ? existingChat.title 
              : title;

            setChatHistory(prev => prev.map(chat =>
              chat.id === currentChatId
                ? { ...chat, messages: messages, title: finalTitle, timestamp: new Date().toISOString() }
                : chat
            ));

            // Update backend
            await fetch('http://localhost:5001/api/history/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_email: userProfile.email,
                chat_id: currentChatId,
                messages: messages,
                title: finalTitle
              })
            });
          }
        } catch (err) {
          console.error('Failed to save chat:', err);
        }
      };

      // Only save if we have user messages and not in the middle of generation
      const hasUserMessages = messages.some(m => m.role === 'user');
      if (hasUserMessages && !isGenerating) {
        const timeoutId = setTimeout(saveChat, 1000);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [messages, backendConnected, userProfile.email, currentChatId, isGenerating, chatHistory]);

  // Check backend connection on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/health');
        if (response.ok) {
          setBackendConnected(true);
        }
      } catch (error) {
        setBackendConnected(false);
      }
    };
    checkBackend();
  }, []);

  // Add a function to check model status on component mount
  useEffect(() => {
    const checkModelStatus = async () => {
      if (backendConnected) {
        try {
          const response = await fetch('http://localhost:5001/api/model/status');
          if (response.ok) {
            const status = await response.json();
            if (status.loaded) {
              setModelLoaded(true);
              setModelName(status.model_name);
              setModelType('gguf');
            }
          }
        } catch (error) {
          console.log('No model currently loaded');
        }
      }
    };
    
    if (backendConnected) {
      checkModelStatus();
    }
  }, [backendConnected]);

  const callBackendAPI = async (messages, settings, modelType, apiKey) => {
    try {
      const response = await fetch('http://localhost:5001/api/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages,
          model_type: modelType,
          api_key: apiKey,
          settings: {
            temperature: settings.temperature,
            max_tokens: settings.maxTokens,
            top_p: settings.topP,
            model: modelType === 'openai' ? settings.openaiModel : 
                   modelType === 'claude' ? settings.claudeModel : 
                   'gguf-model'
          }
        })
      });

      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.error || `HTTP error! status: ${response.status}`;
        } catch (e) {
          errorText = await response.text();
          if (errorText.includes('<!DOCTYPE')) {
            errorText = 'Backend returned HTML instead of JSON. Make sure the Flask server is running on port 5001.';
          }
        }
        throw new Error(errorText);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      throw error;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      alert('Please enter valid credentials');
      return;
    }

    if (backendConnected) {
      try {
        const response = await fetch('http://localhost:5001/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: loginData.email,
            password: loginData.password
          })
        });

        if (response.ok) {
          const data = await response.json();
          const newProfile = {
            username: data.user.username,
            email: data.user.email,
            password: loginData.password,
            profilePhoto: data.user.profile_photo,
            isLoggedIn: true
          };
          setUserProfile(newProfile);
          setTempProfile(newProfile);
          setCurrentPage('chat');
          
          // Load chat history for this user with better error handling
          try {
            const historyResponse = await fetch(`http://localhost:5001/api/history/list?user_email=${encodeURIComponent(data.user.email)}`);
            if (historyResponse.ok) {
              const historyData = await historyResponse.json();
              if (historyData.chats && historyData.chats.length > 0) {
                // Ensure all chats have proper titles
                const formattedChats = historyData.chats.map(chat => ({
                  id: chat.id,
                  title: chat.title || 'Untitled Chat', // Default title if missing
                  messages: chat.messages || [],
                  timestamp: chat.timestamp || new Date().toISOString()
                }));
                setChatHistory(formattedChats);
              }
            }
          } catch (err) {
            console.error('Failed to load history:', err);
          }
        } else {
          const errorData = await response.json();
          alert(errorData.error || 'Login failed');
        }
      } catch (error) {
        alert('Login failed: ' + error.message);
      }
    } else {
      // Offline mode - use in-memory database
      const user = userDatabase[loginData.email];
      if (user && user.password === loginData.password) {
        setUserProfile({ ...user, isLoggedIn: true });
        setTempProfile({ ...user, isLoggedIn: true });
        setCurrentPage('chat');
        setChatHistory(user.chatHistory || []);
      } else {
        alert('Invalid credentials');
      }
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (signupData.password !== signupData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (!signupData.username || !signupData.email || !signupData.password) {
      alert('Please fill all fields');
      return;
    }

    if (backendConnected) {
      try {
        const response = await fetch('http://localhost:5001/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: signupData.username,
            email: signupData.email,
            password: signupData.password
          })
        });

        if (response.ok) {
          const newProfile = {
            username: signupData.username,
            email: signupData.email,
            password: signupData.password,
            profilePhoto: null,
            isLoggedIn: true
          };
          setUserProfile(newProfile);
          setTempProfile(newProfile);
          setCurrentPage('chat');
        } else {
          const errorData = await response.json();
          alert(errorData.error || 'Signup failed');
        }
      } catch (error) {
        alert('Signup failed: ' + error.message);
      }
    } else {
      // Offline mode - save to in-memory database
      if (userDatabase[signupData.email]) {
        alert('Email already exists');
        return;
      }
      
      const newProfile = {
        username: signupData.username,
        email: signupData.email,
        password: signupData.password,
        profilePhoto: null,
        isLoggedIn: true,
        chatHistory: []
      };
      
      setUserDatabase(prev => ({
        ...prev,
        [signupData.email]: newProfile
      }));
      
      setUserProfile(newProfile);
      setTempProfile(newProfile);
      setCurrentPage('chat');
    }
  };

  const handleProfilePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setTempProfile({...tempProfile, profilePhoto: event.target.result});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleModelUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.gguf')) {
      if (!backendConnected) {
        alert('Backend server is not running. Please start the Flask server on port 5001.');
        return;
      }

      try {
        // First, check if a model is already loaded and unload it
        if (modelLoaded) {
          try {
            await fetch('http://localhost:5001/api/model/unload', {
              method: 'POST'
            });
          } catch (unloadError) {
            console.warn('Could not unload previous model:', unloadError);
          }
        }

        const formData = new FormData();
        formData.append('file', file);
        
        const uploadResponse = await fetch('http://localhost:5001/api/model/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Failed to upload model to backend');
        }
        
        const uploadData = await uploadResponse.json();
        
        const loadResponse = await fetch('http://localhost:5001/api/model/load', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model_name: uploadData.filename,
            n_ctx: 4096,
            n_gpu_layers: 0
          })
        });
        
        if (!loadResponse.ok) {
          const errorData = await loadResponse.json();
          throw new Error(errorData.error || 'Failed to load model in backend');
        }
        
        setModelName(file.name);
        setModelLoaded(true);
        setModelType('gguf');
        setMessages([{
          role: 'system',
          content: `GGUF Model "${file.name}" loaded successfully. You can now start chatting!`,
          timestamp: new Date().toISOString()
        }]);
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    } else {
      alert('Please upload a valid .gguf model file');
    }
  };

  const openApiKeyModal = (type) => {
    setSelectedApiType(type);
    setTempApiKey(apiKeys[type] || '');
    setShowApiKeyModal(true);
  };

  const saveApiKey = () => {
    if (tempApiKey.trim()) {
      const newApiKeys = { ...apiKeys, [selectedApiType]: tempApiKey };
      setApiKeys(newApiKeys);
      setModelLoaded(true);
      setModelType(selectedApiType);
      
      if (selectedApiType === 'openai') {
        setModelName('OpenAI GPT');
        setMessages([{
          role: 'system',
          content: `OpenAI API Key configured successfully. Using model: ${settings.openaiModel}`,
          timestamp: new Date().toISOString()
        }]);
      } else if (selectedApiType === 'claude') {
        setModelName('Claude');
        setMessages([{
          role: 'system',
          content: `Claude API Key configured successfully. Using model: ${settings.claudeModel}`,
          timestamp: new Date().toISOString()
        }]);
      }
      
      setShowApiKeyModal(false);
      setTempApiKey('');
    } else {
      alert('Please enter a valid API key');
    }
  };

  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files).filter(file =>
      file.name.toLowerCase().endsWith('.txt')
    );

    if (files.length === 0) {
      alert('Only .txt files are allowed');
      return;
    }

    const totalSize = [...attachedFiles, ...files].reduce((total, file) => total + (file.size || file.file?.size || 0), 0);
    if (totalSize > 10 * 1024 * 1024) {
      alert('Total file size should be less than 10MB');
      return;
    }

    const newFiles = files.map(file => ({
      name: file.name,
      size: file.size,
      file: file,
      content: null
    }));

    // Allow multiple attachments
    setAttachedFiles([...attachedFiles, ...newFiles]);
  };

  const removeAttachment = (index) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  const newChat = () => {
    // Only save if not a guest
    if (messages.length > 0 && !currentChatId && !isGuestUser()) {
      const chatId = Date.now().toString();
      const firstUserMessage = messages.find(m => m.role === 'user');
      const title = firstUserMessage?.content.substring(0, 30) + (firstUserMessage?.content.length > 30 ? '...' : '') || 'New Chat';

      const newChatObj = {
        id: chatId,
        title: title,
        messages: messages,
        timestamp: new Date().toISOString()
      };

      setChatHistory(prev => [newChatObj, ...prev]);
    }

    setMessages([]);
    setCurrentChatId(null);
    setAttachedFiles([]);
  };

  const loadChat = (chat) => {
    setMessages(chat.messages);
    setCurrentChatId(chat.id);
  };

  const deleteChat = async (chatId) => {
    if (backendConnected && !isGuestUser()) {
      try {
        await fetch(`http://localhost:5001/api/history/delete?user_email=${userProfile.email}&chat_id=${chatId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Failed to delete from backend:', error);
      }
    }

    setChatHistory(chatHistory.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      setMessages([]);
      setCurrentChatId(null);
    }
  };

  const startRenamingChat = (chatId, currentTitle) => {
    setEditingChatId(chatId);
    setEditingChatTitle(currentTitle);
  };

  const saveRenamedChat = async (chatId) => {
    if (editingChatTitle.trim()) {
      const newTitle = editingChatTitle.trim();
      
      // Update local state immediately for better UX
      setChatHistory(prev => prev.map(chat => 
        chat.id === chatId ? { ...chat, title: newTitle } : chat
      ));
      
      // If this is the current chat, also update the messages title context
      if (currentChatId === chatId) {
        // You might want to update something in messages if needed
      }
      
      // Update backend if connected and not guest
      if (backendConnected && !isGuestUser()) {
        try {
          const response = await fetch('http://localhost:5001/api/history/rename', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_email: userProfile.email,
              chat_id: chatId,
              title: newTitle
            })
          });
          
          if (!response.ok) {
            throw new Error('Failed to update title on server');
          }
          
          console.log('Chat title updated successfully on server');
        } catch (error) {
          console.error('Failed to rename in backend:', error);
          // Revert local changes if backend update fails
          setChatHistory(prev => prev.map(chat => 
            chat.id === chatId ? { ...chat, title: editingChatTitle } : chat
          ));
          alert('Failed to save title to server. Changes reverted.');
        }
      }
      
      setEditingChatId(null);
      setEditingChatTitle('');
    }
  };

  const callOpenAI = async (messageContent) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys.openai}`
        },
        body: JSON.stringify({
          model: settings.openaiModel,
          messages: [
            ...messages.filter(m => m.role !== 'system').map(m => ({
              role: m.role,
              content: m.content
            })),
            { role: 'user', content: messageContent }
          ],
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          top_p: settings.topP
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API request failed');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      throw error;
    }
  };

  const callClaude = async (messageContent) => {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKeys.claude,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: settings.claudeModel,
          max_tokens: settings.maxTokens,
          messages: [
            ...messages.filter(m => m.role !== 'system').map(m => ({
              role: m.role,
              content: m.content
            })),
            { role: 'user', content: messageContent }
          ],
          temperature: settings.temperature
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Claude API request failed');
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      throw error;
    }
  };

  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;
    if (!modelLoaded) {
      alert('Please load a GGUF model or configure API key first');
      return;
    }

    let messageContent = input;

    // For GGUF models, upload files to backend first
    if (attachedFiles.length > 0 && modelType === 'gguf') {
      try {
        const formData = new FormData();
        attachedFiles.forEach(fileObj => {
          formData.append('file', fileObj.file);
        });
        
        const uploadResponse = await fetch('http://localhost:5001/api/file/upload', {
          method: 'POST',
          body: formData
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          messageContent += `\n\n--- Attached Files (${attachedFiles.length}) ---`;
          uploadData.files.forEach(file => {
            messageContent += `\n\n[File: ${file.name} - ${(file.size / 1024).toFixed(1)}KB]\n${file.content}`;
          });
          messageContent += '\n\n--- End of Files ---';
        } else {
          throw new Error('Failed to upload files to backend');
        }
      } catch (error) {
        console.error('File upload error:', error);
        // Fallback: read files locally
        messageContent += `\n\n--- Attached Files (${attachedFiles.length}) ---`;
        for (const fileObj of attachedFiles) {
          try {
            const text = await fileObj.file.text();
            messageContent += `\n\n[File: ${fileObj.name} - ${(fileObj.size / 1024).toFixed(1)}KB]\n${text}`;
          } catch (readError) {
            messageContent += `\n\n[File: ${fileObj.name} - Error reading file]`;
            console.error('Error reading file:', readError);
          }
        }
        messageContent += '\n\n--- End of Files ---';
      }
    } else if (attachedFiles.length > 0) {
      // For API models, read files locally
      messageContent += `\n\n--- Attached Files (${attachedFiles.length}) ---`;
      for (const fileObj of attachedFiles) {
        try {
          const text = await fileObj.file.text();
          messageContent += `\n\n[File: ${fileObj.name} - ${(fileObj.size / 1024).toFixed(1)}KB]\n${text}`;
        } catch (readError) {
          messageContent += `\n\n[File: ${fileObj.name} - Error reading file]`;
          console.error('Error reading file:', readError);
        }
      }
      messageContent += '\n\n--- End of Files ---';
    }

    const userMessage = {
      role: 'user',
      content: input,
      attachments: attachedFiles.map(f => f.name),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setAttachedFiles([]);
    setIsGenerating(true);

    try {
      let aiResponse;

      if (modelType === 'openai') {
        aiResponse = await callOpenAI(messageContent);
      } else if (modelType === 'claude') {
        aiResponse = await callClaude(messageContent);
      } else if (modelType === 'gguf') {
        const filteredMessages = updatedMessages.map(m => ({
          role: m.role,
          content: m.role === 'user' && m === userMessage ? messageContent : m.content
        }));
        
        aiResponse = await callBackendAPI(
          filteredMessages,
          settings,
          modelType,
          ''
        );
      }

      const aiMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        role: 'system',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportChat = () => {
    const data = {
      modelName,
      modelType,
      settings,
      messages,
      chatHistory,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importChat = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          
          // Merge imported chats with existing chats instead of replacing
          const importedChats = data.chatHistory || [];
          const existingChats = chatHistory || [];
          
          // Create a map to avoid duplicates by chat ID
          const chatMap = new Map();
          
          // Add existing chats first
          existingChats.forEach(chat => {
            chatMap.set(chat.id, chat);
          });
          
          // Add imported chats (will overwrite duplicates by ID)
          importedChats.forEach(chat => {
            chatMap.set(chat.id, chat);
          });
          
          // Convert back to array and sort by timestamp
          const mergedChats = Array.from(chatMap.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setChatHistory(mergedChats);
          
          // Also update user profile if present
          if (data.userProfile) {
            setUserProfile(prev => ({ ...prev, ...data.userProfile }));
          }
          
          alert('Data imported successfully!');
        } catch (error) {
          alert('Error importing data: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const logout = () => {
    setUserProfile({
      username: 'Guest User',
      email: 'guest@local.user',
      password: '',
      profilePhoto: null,
      isLoggedIn: false
    });
    setTempProfile({
      username: 'Guest User',
      email: 'guest@local.user',
      password: '',
      profilePhoto: null,
      isLoggedIn: false
    });
    setChatHistory([]);
    setCurrentChatId(null);
    setMessages([]);
    setCurrentPage('login');
    setShowUserMenu(false);
  };

  const saveProfile = async () => {
    if (backendConnected && !isGuestUser()) {
      try {
        const response = await fetch('http://localhost:5001/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: tempProfile.email,
            username: tempProfile.username,
            profile_photo: tempProfile.profilePhoto,
            password: tempProfile.password
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update profile');
        }
      } catch (error) {
        alert('Failed to save profile: ' + error.message);
        return;
      }
    }

    setUserProfile(tempProfile);
    setEditingProfile(false);
  };

  const skipLogin = () => {
    setUserProfile({
      username: 'Guest User',
      email: 'guest@local.user',
      isLoggedIn: false
    });
    setCurrentPage('chat');
  };

  // Dynamic classes based on dark mode
  const bgColor = darkMode ? 'bg-gray-900' : 'bg-white';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const sidebarBg = darkMode ? 'bg-gray-800' : 'bg-gray-50';
  const inputBg = darkMode ? 'bg-gray-700' : 'bg-white';
  const hoverBg = darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';

  if (currentPage === 'login') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${bgColor} ${textColor}`}>
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-8 max-w-md w-full shadow-xl`}>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-gray-400">Sign in to your account</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                placeholder="Enter your email"
                className={`w-full px-4 py-3 ${inputBg} rounded-lg border ${borderColor} outline-none focus:ring-2 focus:ring-blue-500`}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                placeholder="Enter your password"
                className={`w-full px-4 py-3 ${inputBg} rounded-lg border ${borderColor} outline-none focus:ring-2 focus:ring-blue-500`}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-400">
              Don't have an account?{' '}
              <button
                onClick={() => setCurrentPage('signup')}
                className="text-blue-500 hover:text-blue-600 font-medium"
              >
                Sign Up
              </button>
            </p>
            <button
              onClick={skipLogin}
              className="text-blue-500 hover:text-blue-600 font-medium text-sm"
            >
              Skip and continue as Guest
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'signup') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${bgColor} ${textColor}`}>
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-8 max-w-md w-full shadow-xl`}>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Create Account</h1>
            <p className="text-gray-400">Join us today</p>
          </div>
          
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={signupData.username}
                onChange={(e) => setSignupData({...signupData, username: e.target.value})}
                placeholder="Choose a username"
                className={`w-full px-4 py-3 ${inputBg} rounded-lg border ${borderColor} outline-none focus:ring-2 focus:ring-blue-500`}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={signupData.email}
                onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                placeholder="Enter your email"
                className={`w-full px-4 py-3 ${inputBg} rounded-lg border ${borderColor} outline-none focus:ring-2 focus:ring-blue-500`}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={signupData.password}
                onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                placeholder="Create a password"
                className={`w-full px-4 py-3 ${inputBg} rounded-lg border ${borderColor} outline-none focus:ring-2 focus:ring-blue-500`}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                value={signupData.confirmPassword}
                onChange={(e) => setSignupData({...signupData, confirmPassword: e.target.value})}
                placeholder="Confirm your password"
                className={`w-full px-4 py-3 ${inputBg} rounded-lg border ${borderColor} outline-none focus:ring-2 focus:ring-blue-500`}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Sign Up
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => setCurrentPage('login')}
                className="text-blue-500 hover:text-blue-600 font-medium"
              >
                Sign In
              </button>
            </p>
            <button
              onClick={skipLogin}
              className="text-blue-500 hover:text-blue-600 font-medium text-sm"
            >
              Skip and continue as Guest
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'about' || currentPage === 'mission' || currentPage === 'privacy') {
    return (
      <div className={`min-h-screen ${bgColor} ${textColor} p-8`}>
        <div className="max-w-3xl mx-auto">
          <button onClick={() => setCurrentPage(userProfile.isLoggedIn ? 'chat' : 'login')} className="mb-6 text-blue-500 hover:text-blue-600">← Back</button>
          {currentPage === 'about' && (
            <>
              <h1 className="text-4xl font-bold mb-6">About Us</h1>
              <div className="space-y-4">
                <p>Welcome to Chatbot UI - an open-source, privacy-focused chatbot interface for you.</p>
                <p>Released under the MIT License, this project is open source and free for everyone.</p>
              </div>
            </>
          )}
          {currentPage === 'mission' && (
            <>
              <h1 className="text-4xl font-bold mb-6">Our Mission</h1>
              <div className="space-y-4">
                <p className="text-lg">Provide secure, private chatbot interface that respects your data and privacy.</p>
              </div>
            </>
          )}
          {currentPage === 'privacy' && (
            <>
              <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
              <div className="space-y-4">
                <p className="text-lg font-semibold">Your privacy is sacred. Your data belongs to you.</p>
                <p>All conversations are stored in memory during your session. Guest mode doesn't save any history.</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${bgColor} ${textColor}`}>
      <div className={`w-64 ${sidebarBg} flex flex-col border-r ${borderColor}`}>
        <div className={`p-3 border-b ${borderColor}`}>
          <button
            onClick={newChat}
            className={`w-full px-3 py-2.5 ${inputBg} ${hoverBg} rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors`}
          >
            <Plus size={18} />
            New chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {isGuestUser() ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <MessageSquare size={32} className="mb-2 opacity-50" />
              <p className="text-sm text-center px-2">Guest mode: No history saved</p>
            </div>
          ) : chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <MessageSquare size={32} className="mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            chatHistory.map((chat) => (
              <div
                key={chat.id}
                className={`group px-3 py-2.5 mb-1 rounded-lg cursor-pointer ${hoverBg} ${
                  currentChatId === chat.id ? (darkMode ? 'bg-gray-800' : 'bg-gray-200') : ''
                }`}
                onClick={() => loadChat(chat)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MessageSquare size={16} className="flex-shrink-0" />
                    {editingChatId === chat.id ? (
                      <input
                        type="text"
                        value={editingChatTitle}
                        onChange={(e) => setEditingChatTitle(e.target.value)}
                        onBlur={() => saveRenamedChat(chat.id)}
                        onKeyPress={(e) => e.key === 'Enter' && saveRenamedChat(chat.id)}
                        onClick={(e) => e.stopPropagation()}
                        className={`flex-1 ${inputBg} border-b ${borderColor} outline-none text-sm`}
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm truncate">{chat.title}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startRenamingChat(chat.id, chat.title);
                      }}
                      className="text-gray-400 hover:text-blue-400"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(chat.id);
                      }}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={`p-3 border-t ${borderColor} space-y-2`}>
          {!isGuestUser() && (
            <>
              <input
                type="file"
                ref={importInputRef}
                onChange={importChat}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => importInputRef.current?.click()}
                className={`w-full px-3 py-2 ${hoverBg} rounded-lg flex items-center gap-3 text-sm transition-colors`}
              >
                <Download size={18} />
                Import data
              </button>
              <button
                onClick={exportChat}
                className={`w-full px-3 py-2 ${hoverBg} rounded-lg flex items-center gap-3 text-sm transition-colors`}
              >
                <Upload size={18} />
                Export data
              </button>
            </>
          )}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full px-3 py-2 ${hoverBg} rounded-lg flex items-center gap-3 text-sm transition-colors`}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? 'Light' : 'Dark'} mode
          </button>
          
          <div className={`pt-2 border-t ${borderColor}`}>
            <p className="text-xs text-gray-500 mb-2 px-3">Model Settings:</p>
            <input
              type="file"
              ref={modelInputRef}
              onChange={handleModelUpload}
              accept=".gguf"
              className="hidden"
            />
            <button
              onClick={() => modelInputRef.current?.click()}
              className={`w-full px-3 py-2 ${hoverBg} rounded-lg flex items-center gap-3 text-sm transition-colors ${modelType === 'gguf' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
            >
              <Cpu size={18} />
              Load GGUF
            </button>
            {modelLoaded && modelType === 'gguf' && (
              <button
                onClick={async () => {
                  try {
                    await fetch('http://localhost:5001/api/model/unload', {
                      method: 'POST'
                    });
                    setModelLoaded(false);
                    setModelName('');
                    setModelType('');
                    setMessages([{
                      role: 'system',
                      content: 'Model unloaded successfully.',
                      timestamp: new Date().toISOString()
                    }]);
                  } catch (error) {
                    alert('Failed to unload model: ' + error.message);
                  }
                }}
                className={`w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-3 text-sm transition-colors mt-1`}
              >
                <Trash2 size={18} />
                Unload GGUF Model
              </button>
            )}
            <button
              onClick={() => openApiKeyModal('openai')}
              className={`w-full px-3 py-2 ${hoverBg} rounded-lg flex items-center gap-3 text-sm transition-colors mt-1 ${modelType === 'openai' ? 'bg-green-600 text-white hover:bg-green-700' : ''}`}
            >
              <Key size={18} />
              OpenAI API
            </button>
            <button
              onClick={() => openApiKeyModal('claude')}
              className={`w-full px-3 py-2 ${hoverBg} rounded-lg flex items-center gap-3 text-sm transition-colors mt-1 ${modelType === 'claude' ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}`}
            >
              <Brain size={18} />
              Claude API
            </button>
          </div>
          
          <div className={`relative pt-2 border-t ${borderColor}`}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`w-full px-3 py-2 ${hoverBg} rounded-lg flex items-center gap-3 text-sm transition-colors`}
            >
              {userProfile.profilePhoto ? (
                <img src={userProfile.profilePhoto} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {userProfile.username.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="flex-1 text-left truncate">{userProfile.username}</span>
            </button>

            {showUserMenu && (
              <div className={`absolute bottom-full left-0 right-0 mb-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${borderColor} overflow-hidden`}>
                <button
                  onClick={() => {
                    if (isGuestUser()) {
                      alert('Guest users cannot access settings. Please sign up or login.');
                    } else {
                      setEditingProfile(true);
                      setShowUserMenu(false);
                    }
                  }}
                  className={`w-full px-4 py-2.5 ${hoverBg} flex items-center gap-3 text-sm`}
                >
                  <Settings size={16} />
                  Settings
                </button>
                {!isGuestUser() && (
                  <button
                    onClick={logout}
                    className={`w-full px-4 py-2.5 ${hoverBg} flex items-center gap-3 text-sm text-red-500`}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-2xl text-center">
              <h1 className="text-4xl font-bold mb-4">Welcome to Chatbot UI</h1>
              <p className={`text-lg mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Open-source interface where privacy belongs to you
              </p>
              {isGuestUser() && (
                <p className="text-yellow-500 text-sm mb-4">
                  🔒 Guest Mode: Chats are not saved. Sign up to save your conversations.
                </p>
              )}
              <div className="flex gap-4 justify-center mb-4">
                <div className={`p-4 ${inputBg} rounded-lg`}>
                  <Cpu size={32} className="mx-auto mb-2" />
                  <p className="text-sm font-medium">GGUF Model</p>
                </div>
                <div className={`p-4 ${inputBg} rounded-lg`}>
                  <Key size={32} className="mx-auto mb-2" />
                  <p className="text-sm font-medium">OpenAI API</p>
                </div>
                <div className={`p-4 ${inputBg} rounded-lg`}>
                  <Brain size={32} className="mx-auto mb-2" />
                  <p className="text-sm font-medium">Claude API</p>
                </div>
              </div>
              {modelLoaded && (
                <div className={`mt-6 inline-block px-4 py-2 ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'} rounded-lg`}>
                  ✓ Active: {modelName}
                </div>
              )}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`py-6 px-4 ${
                  msg.role === 'assistant' ? (darkMode ? 'bg-gray-800/50' : 'bg-gray-50') : ''
                } ${msg.role === 'system' ? 'opacity-70 italic' : ''}`}
              >
                <div className="max-w-3xl mx-auto flex gap-4">
                  {msg.role === 'user' ? (
                    userProfile.profilePhoto ? (
                      <img src={userProfile.profilePhoto} alt="User" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white" style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      }}>
                        {userProfile.username.charAt(0).toUpperCase()}
                      </div>
                    )
                  ) : (
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white" style={{
                      background: msg.role === 'system'
                        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    }}>
                      {msg.role === 'system' ? '⚙' : 'AI'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 text-xs opacity-70">
                        📎 {msg.attachments.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className={`py-6 px-4 ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                <div className="max-w-3xl mx-auto flex gap-4">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white" style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  }}>
                    AI
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="animate-pulse">Thinking...</p>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {attachedFiles.length > 0 && (
          <div className={`px-4 py-2 border-t ${borderColor}`}>
            <div className="max-w-3xl mx-auto">
              <p className="text-sm text-gray-500 mb-2">
                Attached files ({attachedFiles.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 ${inputBg} rounded-lg text-sm`}>
                    <span>📄 {file.name} ({(file.size / 1024).toFixed(1)}KB)</span>
                    <button
                      onClick={() => removeAttachment(idx)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className={`p-4 border-t ${borderColor}`}>
          <div className="max-w-3xl mx-auto">
            <div className={`flex gap-2 items-end ${inputBg} rounded-2xl p-2`}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileAttach}
                accept=".txt"
                multiple
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 ${hoverBg} rounded-lg transition-colors`}
                title="Attach .txt files"
              >
                <Paperclip size={20} />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Send a message..."
                disabled={isGenerating}
                className={`flex-1 px-2 py-2 bg-transparent outline-none ${isGenerating ? 'opacity-50' : ''}`}
              />
              <button
                onClick={handleSend}
                disabled={!modelLoaded || (!input.trim() && attachedFiles.length === 0) || isGenerating}
                className={`p-2 rounded-lg transition-colors ${
                  modelLoaded && (input.trim() || attachedFiles.length > 0) && !isGenerating
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-md w-full`}>
            <h2 className="text-2xl font-bold mb-4">
              {selectedApiType === 'openai' ? 'OpenAI' : 'Claude'} API Key
            </h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
              Enter your {selectedApiType === 'openai' ? 'OpenAI' : 'Claude'} API key
            </p>
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder={`Enter ${selectedApiType === 'openai' ? 'OpenAI' : 'Claude'} API Key`}
              className={`w-full px-4 py-3 ${inputBg} rounded-lg border ${borderColor} outline-none focus:ring-2 focus:ring-blue-500 mb-4`}
            />
            {selectedApiType === 'openai' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Model</label>
                <select
                  value={settings.openaiModel}
                  onChange={(e) => setSettings({...settings, openaiModel: e.target.value})}
                  className={`w-full px-4 py-2 ${inputBg} rounded-lg border ${borderColor} outline-none`}
                >
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="o1-preview">O1 Preview</option>
                  <option value="o1-mini">O1 Mini</option>
                </select>
              </div>
            )}
            {selectedApiType === 'claude' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Model</label>
                <select
                  value={settings.claudeModel}
                  onChange={(e) => setSettings({...settings, claudeModel: e.target.value})}
                  className={`w-full px-4 py-2 ${inputBg} rounded-lg border ${borderColor} outline-none`}
                >
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="claude-opus-4-20250514">Claude Opus 4</option>
                  <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                </select>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApiKeyModal(false);
                  setTempApiKey('');
                }}
                className={`flex-1 px-4 py-2 ${inputBg} ${hoverBg} rounded-lg transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={saveApiKey}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {editingProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto`}>
            <h2 className="text-2xl font-bold mb-4">User Settings</h2>
            <div className="space-y-4">
              <div className="flex flex-col items-center mb-4">
                <input
                  type="file"
                  ref={profilePhotoRef}
                  onChange={handleProfilePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div className="relative">
                  {tempProfile.profilePhoto ? (
                    <img src={tempProfile.profilePhoto} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-3xl">
                      {tempProfile.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={() => profilePhotoRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white"
                  >
                    <Camera size={16} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Max 2MB</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  <User size={16} className="inline mr-2" />
                  Username
                </label>
                <input
                  type="text"
                  value={tempProfile.username}
                  onChange={(e) => setTempProfile({...tempProfile, username: e.target.value})}
                  className={`w-full px-3 py-2 ${inputBg} rounded-lg border ${borderColor} outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  <Mail size={16} className="inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={tempProfile.email}
                  disabled
                  className={`w-full px-3 py-2 ${inputBg} rounded-lg border ${borderColor} outline-none opacity-70 cursor-not-allowed`}
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  <Lock size={16} className="inline mr-2" />
                  New Password (optional)
                </label>
                <input
                  type="password"
                  value={tempProfile.password || ''}
                  onChange={(e) => setTempProfile({...tempProfile, password: e.target.value})}
                  placeholder="Leave blank to keep current"
                  className={`w-full px-3 py-2 ${inputBg} rounded-lg border ${borderColor} outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              
              <div className={`pt-4 border-t ${borderColor}`}>
                <h3 className="text-lg font-semibold mb-3">Model Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm mb-1">Temperature: {settings.temperature}</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={settings.temperature}
                      onChange={(e) => setSettings({...settings, temperature: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Max Tokens: {settings.maxTokens}</label>
                    <input
                      type="range"
                      min="128"
                      max="4096"
                      step="128"
                      value={settings.maxTokens}
                      onChange={(e) => setSettings({...settings, maxTokens: parseInt(e.target.value)})}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Top P: {settings.topP}</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.topP}
                      onChange={(e) => setSettings({...settings, topP: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setTempProfile({...userProfile});
                  setEditingProfile(false);
                }}
                className={`flex-1 px-4 py-2 ${inputBg} ${hoverBg} rounded-lg transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}