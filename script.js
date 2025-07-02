
// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBKxlvOEUiFI3c7mYQmI6ugdaTl1bKf3kQ",
    authDomain: "novacrashapp.firebaseapp.com",
    databaseURL: "https://novacrashapp-default-rtdb.firebaseio.com",
    projectId: "novacrashapp",
    storageBucket: "novacrashapp.firebasestorage.app",
    messagingSenderId: "1030132959552",
    appId: "1:1030132959552:web:e02bc8e29056b2ecd192a5",
    measurementId: "G-VJDPN63DFJ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// OpenAI API Configuration
const OPENAI_BASE_URL = "https://api.openai.com/v1";
const OPENAI_API_KEY = "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";

const AVAILABLE_MODELS = {
    "text": "gpt-3.5-turbo",
    "gpt4": "gpt-4",
    "image": "dall-e-2"
};

// Global variables
let currentUser = null;
let uploadedImage = null;

// Usage limits
const DAILY_LIMITS = {
    messages: 10,
    images: 1,
    logos: 1
};

const COOLDOWN_TIMES = {
    message: 5 * 60 * 60 * 1000, // 5 hours in milliseconds
    daily: 24 * 60 * 60 * 1000   // 24 hours in milliseconds
};

let usageData = {
    messages: 0,
    images: 0,
    logos: 0,
    lastMessageTime: 0,
    lastResetTime: Date.now(),
    messageCooldownEnd: 0
};

// Email validation function
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.includes('@gmail.com');
}

// Password validation function
function isValidPassword(password) {
    return password.length >= 6;
}

// Show message function
function showMessage(message, type = 'error') {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    
    const form = document.querySelector('.auth-form');
    if (form) {
        const existingMessage = form.querySelector('.error-message, .success-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        form.insertBefore(messageDiv, form.firstChild);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Check authentication and redirect
function checkAuthAndRedirect() {
    // Check if user has joined Telegram channel
    const hasJoinedTelegram = localStorage.getItem('telegramJoined') === 'true';
    
    if (!hasJoinedTelegram) {
        setTimeout(() => {
            window.location.href = 'telegram-join.html';
        }, 3000);
        return;
    }
    
    const user = auth.currentUser;
    if (user) {
        setTimeout(() => {
            window.location.href = 'chat.html';
        }, 3000);
    } else {
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
    }
}

// Auth state observer
auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
        // User is signed in
        const userData = {
            uid: user.uid,
            email: user.email,
            username: user.displayName || user.email.split('@')[0],
            status: 'active',
            lastLogin: firebase.database.ServerValue.TIMESTAMP
        };
        
        database.ref('users/' + user.uid).update(userData);
    }
});

// Loading screen management
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
    }, 3000);
});

// Sign up function
async function signUp() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate email
    if (!email) {
        showMessage('অনুগ্রহ করে একটি ইমেইল ঠিকানা লিখুন।');
        return;
    }
    
    if (!isValidEmail(email)) {
        showMessage('অনুগ্রহ করে একটি বৈধ @gmail.com ইমেইল ঠিকানা ব্যবহার করুন।');
        return;
    }
    
    // Validate password
    if (!password) {
        showMessage('অনুগ্রহ করে একটি পাসওয়ার্ড দিন।');
        return;
    }
    
    if (!isValidPassword(password)) {
        showMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('পাসওয়ার্ড মিলছে না। অনুগ্রহ করে আবার চেষ্টা করুন।');
        return;
    }
    
    try {
        // Check if user already exists
        const userExists = await checkUserExists(email);
        if (userExists) {
            showMessage('এই ইমেইল ঠিকানা দিয়ে ইতিমধ্যে একাউন্ট রয়েছে।');
            return;
        }
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Save user data to database
        await database.ref('users/' + user.uid).set({
            uid: user.uid,
            email: email,
            username: email.split('@')[0],
            status: 'active',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        showMessage('সাইন আপ সফল হয়েছে! চ্যাট পেজে নিয়ে যাওয়া হচ্ছে...', 'success');
        
        setTimeout(() => {
            window.location.href = 'chat.html';
        }, 2000);
        
    } catch (error) {
        console.error('Sign up error:', error);
        if (error.code === 'auth/email-already-in-use') {
            showMessage('এই ইমেইল ঠিকানা ইতিমধ্যে ব্যবহৃত হয়েছে।');
        } else if (error.code === 'auth/weak-password') {
            showMessage('পাসওয়ার্ড খুবই দুর্বল। অনুগ্রহ করে আরো শক্তিশালী পাসওয়ার্ড ব্যবহার করুন।');
        } else {
            showMessage('সাইন আপ করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
        }
    }
}

// Login function
async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Validate email
    if (!email) {
        showMessage('অনুগ্রহ করে ইমেইল ঠিকানা লিখুন।');
        return;
    }
    
    if (!isValidEmail(email)) {
        showMessage('অনুগ্রহ করে একটি বৈধ @gmail.com ইমেইল ঠিকানা ব্যবহার করুন।');
        return;
    }
    
    // Validate password
    if (!password) {
        showMessage('অনুগ্রহ করে পাসওয়ার্ড দিন।');
        return;
    }
    
    try {
        // Check if account exists
        const userExists = await checkUserExists(email);
        if (!userExists) {
            showMessage('এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট নেই।');
            return;
        }
        
        await auth.signInWithEmailAndPassword(email, password);
        showMessage('লগইন সফল হয়েছে! চ্যাট পেজে নিয়ে যাওয়া হচ্ছে...', 'success');
        
        setTimeout(() => {
            window.location.href = 'chat.html';
        }, 2000);
        
    } catch (error) {
        console.error('Login error:', error);
        if (error.code === 'auth/wrong-password') {
            showMessage('পাসওয়ার্ড সঠিক নয়।');
        } else if (error.code === 'auth/user-not-found') {
            showMessage('এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট নেই।');
        } else {
            showMessage('লগইন করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
        }
    }
}

// Check if user exists
async function checkUserExists(email) {
    try {
        const methods = await auth.fetchSignInMethodsForEmail(email);
        return methods.length > 0;
    } catch (error) {
        console.error('Error checking user:', error);
        return false;
    }
}

// Google Sign In
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // Save user data to database
        await database.ref('users/' + user.uid).set({
            uid: user.uid,
            email: user.email,
            username: user.displayName || user.email.split('@')[0],
            status: 'active',
            provider: 'google',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        showMessage('Google দিয়ে সাইন আপ সফল হয়েছে!', 'success');
        
        setTimeout(() => {
            window.location.href = 'chat.html';
        }, 2000);
        
    } catch (error) {
        console.error('Google sign in error:', error);
        showMessage('Google সাইন ইন করতে সমস্যা হয়েছে।');
    }
}

// Password reset function
async function resetPassword() {
    const email = document.getElementById('resetEmail').value.trim();
    
    if (!email) {
        showMessage('অনুগ্রহ করে ইমেইল ঠিকানা লিখুন।');
        return;
    }
    
    if (!isValidEmail(email)) {
        showMessage('অনুগ্রহ করে একটি বৈধ @gmail.com ইমেইল ঠিকানা ব্যবহার করুন।');
        return;
    }
    
    try {
        const userExists = await checkUserExists(email);
        if (!userExists) {
            showMessage('এই ইমেইলে কোনো অ্যাকাউন্ট নেই।');
            return;
        }
        
        await auth.sendPasswordResetEmail(email);
        showMessage('আপনার ইমেইলে রিসেট লিংক পাঠানো হয়েছে।', 'success');
        
    } catch (error) {
        console.error('Password reset error:', error);
        showMessage('পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে।');
    }
}

// Usage limit functions
function loadUsageData() {
    const saved = localStorage.getItem('usageData');
    if (saved) {
        usageData = JSON.parse(saved);
        // Check if 24 hours have passed since last reset
        if (Date.now() - usageData.lastResetTime > COOLDOWN_TIMES.daily) {
            resetDailyLimits();
        }
    }
    updateUsageDisplay();
}

function saveUsageData() {
    localStorage.setItem('usageData', JSON.stringify(usageData));
}

function resetDailyLimits() {
    usageData.messages = 0;
    usageData.images = 0;
    usageData.logos = 0;
    usageData.lastResetTime = Date.now();
    usageData.messageCooldownEnd = 0;
    saveUsageData();
}

function canSendMessage() {
    // Check if user is in cooldown
    if (Date.now() < usageData.messageCooldownEnd) {
        return false;
    }
    
    // Check daily message limit
    return usageData.messages < DAILY_LIMITS.messages;
}

function canUploadImage() {
    return usageData.images < DAILY_LIMITS.images;
}

function canCreateLogo() {
    return usageData.logos < DAILY_LIMITS.logos;
}

function updateUsageDisplay() {
    const messageCountEl = document.getElementById('messageCount');
    const imageCountEl = document.getElementById('imageCount');
    const logoCountEl = document.getElementById('logoCount');
    const usageLimitsEl = document.getElementById('usageLimits');
    
    if (messageCountEl) messageCountEl.textContent = usageData.messages;
    if (imageCountEl) imageCountEl.textContent = usageData.images;
    if (logoCountEl) logoCountEl.textContent = usageData.logos;
    
    // Check if in cooldown
    if (Date.now() < usageData.messageCooldownEnd) {
        const remainingTime = Math.ceil((usageData.messageCooldownEnd - Date.now()) / (1000 * 60 * 60));
        if (usageLimitsEl) {
            usageLimitsEl.innerHTML = `<small class="cooldown-timer">⏰ পরবর্তী মেসেজের জন্য ${remainingTime} ঘন্টা অপেক্ষা করুন</small>`;
        }
    } else {
        // Show usage limits with color coding
        const messageClass = usageData.messages >= DAILY_LIMITS.messages ? 'limit-exceeded' : '';
        const imageClass = usageData.images >= DAILY_LIMITS.images ? 'limit-exceeded' : '';
        const logoClass = usageData.logos >= DAILY_LIMITS.logos ? 'limit-exceeded' : '';
        
        if (usageLimitsEl) {
            usageLimitsEl.innerHTML = `
                <small>
                    <span class="${messageClass}">মেসেজ: ${usageData.messages}/${DAILY_LIMITS.messages}</span> | 
                    <span class="${imageClass}">ছবি: ${usageData.images}/${DAILY_LIMITS.images}</span> | 
                    <span class="${logoClass}">লোগো: ${usageData.logos}/${DAILY_LIMITS.logos}</span>
                </small>
            `;
        }
    }
    
    // Update button states
    const galleryBtn = document.querySelector('.gallery-btn');
    const sendBtn = document.querySelector('.send-button');
    
    if (galleryBtn) {
        galleryBtn.disabled = !canUploadImage();
    }
    
    if (sendBtn) {
        sendBtn.disabled = !canSendMessage();
    }
}

function incrementUsage(type) {
    switch(type) {
        case 'message':
            usageData.messages++;
            if (usageData.messages >= DAILY_LIMITS.messages) {
                usageData.messageCooldownEnd = Date.now() + COOLDOWN_TIMES.message;
            }
            break;
        case 'image':
            usageData.images++;
            break;
        case 'logo':
            usageData.logos++;
            break;
    }
    saveUsageData();
    updateUsageDisplay();
}

// Logout function
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Logout error:', error);
    });
}

// Gallery function
function openGallery() {
    if (!canUploadImage()) {
        addMessageToChat('দুঃখিত, আজকের জন্য ছবি আপলোডের সীমা শেষ। ২৪ ঘন্টা পর আবার চেষ্টা করুন।', 'ai');
        return;
    }
    
    const imageInput = document.getElementById('imageInput');
    imageInput.click();
}

// Handle image upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!canUploadImage()) {
        alert('দুঃখিত, আজকের জন্য ছবি আপলোডের সীমা শেষ।');
        event.target.value = '';
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        alert('অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন।');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedImage = e.target.result;
        showImagePreview(uploadedImage);
        incrementUsage('image');
    };
    reader.readAsDataURL(file);
}

// Show image preview
function showImagePreview(imageSrc) {
    const messagesContainer = document.getElementById('chatMessages');
    const previewDiv = document.createElement('div');
    previewDiv.className = 'message user';
    previewDiv.innerHTML = `
        <img src="${imageSrc}" class="image-preview" alt="আপলোড করা ছবি">
        <p style="margin-top: 5px; font-size: 0.9rem; opacity: 0.8;">ছবি আপলোড করা হয়েছে। এখন মেসেজ পাঠান।</p>
    `;
    
    messagesContainer.appendChild(previewDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// AI Chat functions
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message && !uploadedImage) return;
    
    // Check usage limits
    if (!canSendMessage()) {
        const remainingTime = Math.ceil((usageData.messageCooldownEnd - Date.now()) / (1000 * 60 * 60));
        addMessageToChat(`দুঃখিত, আপনি আজকের সীমা অতিক্রম করেছেন। পরবর্তী মেসেজের জন্য ${remainingTime} ঘন্টা অপেক্ষা করুন।`, 'ai');
        return;
    }
    
    // If there's an uploaded image but no message, ask for description
    if (uploadedImage && !message) {
        addMessageToChat('অনুগ্রহ করে ছবি সম্পর্কে কিছু লিখুন বা প্রশ্ন করুন।', 'ai');
        return;
    }
    
    // Add user message to chat if there's text
    if (message) {
        addMessageToChat(message, 'user');
        incrementUsage('message');
    }
    
    input.value = '';
    
    // Show typing indicator
    const typingDiv = addTypingIndicator();
    
    try {
        // Check if it's an image generation request
        const isImageRequest = message.toLowerCase().includes('image') || 
                               message.toLowerCase().includes('generate') ||
                               message.toLowerCase().includes('picture') ||
                               message.toLowerCase().includes('ছবি') ||
                               message.toLowerCase().includes('draw') ||
                               message.toLowerCase().includes('create') ||
                               message.toLowerCase().includes('make') ||
                               message.toLowerCase().includes('তৈরি') ||
                               message.toLowerCase().includes('বানা');
        
        if (isImageRequest) {
            // Show image processing message
            typingDiv.innerHTML = `
                <span>🎨 ছবি তৈরি করা হচ্ছে...</span><br>
                <small style="opacity: 0.7;">এই মুহূর্তে অনেকেই ছবি তৈরি করছেন, তাই কিছুটা সময় লাগতে পারে। আপনার ছবি প্রস্তুত হলে আমরা আপনাকে জানাব।</small>
            `;
            await generateImage(message, typingDiv);
        } else if (uploadedImage) {
            await analyzeImageWithText(message, uploadedImage, typingDiv);
        } else {
            await generateTextResponse(message, typingDiv);
        }
        
        // Clear uploaded image after sending
        uploadedImage = null;
        document.getElementById('imageInput').value = '';
        
    } catch (error) {
        console.error('AI Error:', error);
        typingDiv.remove();
        addMessageToChat('দুঃখিত, এই মুহূর্তে AI সেবা উপলব্ধ নেই। অনুগ্রহ করে আবার চেষ্টা করুন।', 'ai');
        uploadedImage = null;
        document.getElementById('imageInput').value = '';
    }
}

// Analyze image with text using OpenAI Vision API
async function analyzeImageWithText(message, image, typingDiv) {
    try {
        const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-4-vision-preview",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: message || "এই ছবি সম্পর্কে বিস্তারিত বলুন।"
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: image
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500
            })
        });
        
        if (!response.ok) {
            throw new Error(`OpenAI Vision API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        let aiMessage = 'আমি আপনার ছবি দেখতে পাচ্ছি এবং বিশ্লেষণ করছি। কিন্তু এই মুহূর্তে বিস্তারিত বলতে পারছি না।';
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            aiMessage = data.choices[0].message.content;
        }
        
        typingDiv.remove();
        addMessageToChat(aiMessage, 'ai');
        
    } catch (error) {
        console.error('Image analysis error:', error);
        typingDiv.remove();
        addMessageToChat('ছবি বিশ্লেষণ করতে সমস্যা হয়েছে। আমি আপনার ছবি দেখতে পাচ্ছি কিন্তু এই মুহূর্তে বিস্তারিত বলতে পারছি না। আপনি চাইলে আবার চেষ্টা করতে পারেন।', 'ai');
    }
}

// Generate text response using OpenAI API
async function generateTextResponse(message, typingDiv) {
    try {
        const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: AVAILABLE_MODELS.text,
                messages: [
                    {
                        role: "system",
                        content: "You are GPToraAI, an advanced AI assistant. You are helpful, creative, and can assist with various tasks including coding, writing, research, and problem-solving. Respond in Bengali when the user asks in Bengali, and in English when they ask in English."
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('OpenAI Response:', data);
        
        let aiMessage = 'আমি GPToraAI, আপনার উন্নত AI সহায়ক! GPT-3.5 এবং DALL·E 2 প্রযুক্তি ব্যবহার করে আমি আপনার যেকোনো প্রশ্নের উত্তর দিতে পারি। আপনার প্রশ্ন করুন!';
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            aiMessage = data.choices[0].message.content;
        }
        
        typingDiv.remove();
        addMessageToChat(aiMessage, 'ai');
        
    } catch (error) {
        console.error('OpenAI API error:', error);
        typingDiv.remove();
        
        // Provide helpful fallback responses
        const fallbackResponses = [
            `আমি GPToraAI, আপনার AI সহায়ক! "${message}" সম্পর্কে আপনার প্রশ্নটি খুবই আকর্ষণীয়। আমি GPT-3.5 এবং DALL·E 2 প্রযুক্তি ব্যবহার করে বিভিন্ন ধরনের সাহায্য করতে পারি। আরো নির্দিষ্ট প্রশ্ন করুন!`,
            `হ্যালো! আমি GPToraAI। আপনার "${message}" প্রশ্নের জন্য ধন্যবাদ। আমি প্রোগ্রামিং, লেখালেখি, গবেষণা, ছবি তৈরি এবং আরো অনেক কিছুতে সাহায্য করতে পারি। কিভাবে সাহায্য করতে পারি?`,
            `আমি GPToraAI, একটি উন্নত AI সিস্টেম। "${message}" - এই বিষয়ে আমি সাহায্য করতে পারি। আমার কাছে GPT-3.5 এবং DALL·E 2 এর শক্তি রয়েছে। আপনি চাইলে আমি কোড লিখে দিতে পারি, গল্প লিখতে পারি, ছবি তৈরি করতে পারি বা যেকোনো প্রশ্নের উত্তর দিতে পারি!`
        ];
        
        const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        addMessageToChat(randomResponse, 'ai');
    }
}

// Generate image using DALL-E 2
async function generateImage(prompt, typingDiv) {
    // Check logo creation limit
    if (!canCreateLogo()) {
        typingDiv.remove();
        addMessageToChat('দুঃখিত, আজকের জন্য লোগো তৈরির সীমা শেষ। ২৪ ঘন্টা পর আবার চেষ্টা করুন।', 'ai');
        return;
    }
    
    try {
        // Update typing message to show image creation process
        typingDiv.innerHTML = `
            <span>🎨 ছবি তৈরি করা হচ্ছে...</span><br>
            <small style="opacity: 0.7;">AI আপনার বর্ণনা অনুযায়ী ছবি তৈরি করছে। অনুগ্রহ করে অপেক্ষা করুন...</small>
        `;
        
        const response = await fetch(`${OPENAI_BASE_URL}/images/generations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: AVAILABLE_MODELS.image,
                prompt: prompt,
                n: 1,
                size: "512x512"
            })
        });
        
        if (!response.ok) {
            throw new Error(`DALL-E 2 generation failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('DALL-E 2 Response:', data);
        
        if (data.data && data.data[0] && data.data[0].url) {
            typingDiv.remove();
            
            // Track logo usage
            incrementUsage('logo');
            
            // Add success message before showing image
            addMessageToChat('✅ আপনার ছবি প্রস্তুত হয়েছে! এই ছবিটি আপনার বর্ণনা অনুযায়ী তৈরি করা হয়েছে:', 'ai');
            
            // Add the generated image
            addImageToChat(data.data[0].url, 'ai');
        } else {
            throw new Error('No image generated');
        }
        
    } catch (error) {
        console.error('DALL-E 2 generation error:', error);
        typingDiv.remove();
        addMessageToChat('ছবি তৈরি করতে সমস্যা হয়েছে। DALL·E 2 এর মাধ্যমে আবার চেষ্টা করুন। আরো নির্দিষ্ট বর্ণনা দিন। উদাহরণ: "একটি সুন্দর সূর্যাস্তের ছবি তৈরি করুন"', 'ai');
    }
}

// Add message to chat
function addMessageToChat(message, sender) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = message;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add image to chat
function addImageToChat(imageUrl, sender) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.maxWidth = '100%';
    img.style.borderRadius = '10px';
    img.alt = 'Generated Image';
    
    messageDiv.appendChild(img);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add typing indicator
function addTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai typing';
    typingDiv.innerHTML = '<span>💭 AI চিন্তা করছে...</span>';
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return typingDiv;
}

// Enter key handler for chat
function handleChatKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Side Panel Functions
function toggleSidePanel() {
    const sidePanel = document.getElementById('sidePanel');
    const overlay = document.querySelector('.panel-overlay') || createOverlay();
    
    if (sidePanel.classList.contains('open')) {
        closeSidePanel();
    } else {
        sidePanel.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeSidePanel() {
    const sidePanel = document.getElementById('sidePanel');
    const overlay = document.querySelector('.panel-overlay');
    
    sidePanel.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'panel-overlay';
    overlay.onclick = closeSidePanel;
    document.body.appendChild(overlay);
    return overlay;
}

// Chat History Functions
function showChatHistory() {
    const historyPanel = document.getElementById('chatHistoryPanel');
    const overlay = document.querySelector('.panel-overlay') || createOverlay();
    
    loadChatHistory();
    historyPanel.classList.add('open');
    overlay.classList.add('active');
    closeSidePanel();
}

function closeChatHistory() {
    const historyPanel = document.getElementById('chatHistoryPanel');
    const overlay = document.querySelector('.panel-overlay');
    
    historyPanel.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function loadChatHistory() {
    const historyContent = document.getElementById('historyContent');
    const savedChats = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    
    if (savedChats.length === 0) {
        historyContent.innerHTML = `
            <div style="text-align: center; color: #666; padding: 40px 20px;">
                <i class="fas fa-history" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.3;"></i>
                <p>এখনো কোনো চ্যাট হিস্টরি নেই।<br>নতুন চ্যাট শুরু করুন!</p>
            </div>
        `;
        return;
    }
    
    historyContent.innerHTML = savedChats.map((chat, index) => `
        <div class="history-item" onclick="loadChat(${index})">
            <div class="history-item-title">${chat.title}</div>
            <div class="history-item-preview">${chat.preview}</div>
            <div class="history-item-date">${new Date(chat.date).toLocaleDateString('bn-BD')}</div>
        </div>
    `).join('');
}

function saveCurrentChat() {
    const messages = document.querySelectorAll('.message');
    if (messages.length === 0) return;
    
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    const firstUserMessage = Array.from(messages).find(msg => msg.classList.contains('user'));
    
    if (firstUserMessage) {
        const title = firstUserMessage.textContent.substring(0, 50) + '...';
        const preview = firstUserMessage.textContent.substring(0, 100) + '...';
        
        const chatData = {
            id: Date.now(),
            title: title,
            preview: preview,
            date: new Date().toISOString(),
            messages: Array.from(messages).map(msg => ({
                content: msg.textContent,
                sender: msg.classList.contains('user') ? 'user' : 'ai',
                type: msg.querySelector('img') ? 'image' : 'text',
                imageUrl: msg.querySelector('img')?.src || null
            }))
        };
        
        chatHistory.unshift(chatData);
        if (chatHistory.length > 20) chatHistory.pop(); // Keep only last 20 chats
        
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
}

function loadChat(index) {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    const chat = chatHistory[index];
    
    if (!chat) return;
    
    // Clear current chat
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.innerHTML = '';
    
    // Load messages
    chat.messages.forEach(msg => {
        if (msg.type === 'image' && msg.imageUrl) {
            addImageToChat(msg.imageUrl, msg.sender);
        } else {
            addMessageToChat(msg.content, msg.sender);
        }
    });
    
    closeChatHistory();
}

function newChat() {
    // Save current chat before clearing
    saveCurrentChat();
    
    // Clear messages
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.innerHTML = '';
    
    // Clear input
    document.getElementById('chatInput').value = '';
    uploadedImage = null;
    document.getElementById('imageInput').value = '';
    
    closeSidePanel();
    
    // Show welcome message
    setTimeout(() => {
        addMessageToChat('নতুন চ্যাট শুরু হয়েছে! আমি GPToraAI, আপনার AI সহায়ক। কিভাবে সাহায্য করতে পারি?', 'ai');
    }, 500);
}

function clearChat() {
    if (confirm('আপনি কি সত্যিই এই চ্যাট ক্লিয়ার করতে চান? এটি পুনরুদ্ধার করা যাবে না।')) {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = '';
        uploadedImage = null;
        document.getElementById('imageInput').value = '';
        closeSidePanel();
    }
}

function showUserInfo() {
    const user = auth.currentUser;
    if (user) {
        addMessageToChat(`👤 ব্যবহারকারীর তথ্য:\n📧 ইমেইল: ${user.email}\n🆔 User ID: ${user.uid}\n⏰ শেষ লগইন: ${new Date().toLocaleString('bn-BD')}`, 'ai');
    }
    closeSidePanel();
}

function showUsageStats() {
    const remainingMessages = DAILY_LIMITS.messages - usageData.messages;
    const remainingImages = DAILY_LIMITS.images - usageData.images;
    const remainingLogos = DAILY_LIMITS.logos - usageData.logos;
    
    const timeUntilReset = new Date(usageData.lastResetTime + COOLDOWN_TIMES.daily);
    const resetTime = timeUntilReset.toLocaleString('bn-BD');
    
    addMessageToChat(`📊 আজকের ব্যবহারের পরিসংখ্যান:

✅ বাকি মেসেজ: ${remainingMessages}/${DAILY_LIMITS.messages}
🖼️ বাকি ছবি আপলোড: ${remainingImages}/${DAILY_LIMITS.images}
🎨 বাকি লোগো তৈরি: ${remainingLogos}/${DAILY_LIMITS.logos}

🔄 পরবর্তী রিসেট: ${resetTime}

${Date.now() < usageData.messageCooldownEnd ? '⏰ মেসেজ কুলডাউন চালু আছে' : '✅ মেসেজ পাঠানো যাবে'}`, 'ai');
    
    closeSidePanel();
}

// Enhanced sendMessage function with auto-save
const originalSendMessage = sendMessage;
sendMessage = async function() {
    await originalSendMessage();
    // Auto-save chat after each message
    setTimeout(saveCurrentChat, 1000);
};

// Page load handlers
document.addEventListener('DOMContentLoaded', function() {
    // Load usage data
    loadUsageData();
    
    // Update usage display every minute
    setInterval(updateUsageDisplay, 60000);
    
    // Check if user is authenticated for protected pages
    const protectedPages = ['chat.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    // Check Telegram join status for login/signup pages
    const requiresTelegramJoin = ['login.html', 'signup.html', 'reset-password.html'];
    
    if (requiresTelegramJoin.includes(currentPage)) {
        const hasJoinedTelegram = localStorage.getItem('telegramJoined') === 'true';
        if (!hasJoinedTelegram) {
            window.location.href = 'telegram-join.html';
            return;
        }
    }
    
    if (protectedPages.includes(currentPage)) {
        // Check Telegram join status first
        const hasJoinedTelegram = localStorage.getItem('telegramJoined') === 'true';
        if (!hasJoinedTelegram) {
            window.location.href = 'telegram-join.html';
            return;
        }
        
        auth.onAuthStateChanged((user) => {
            if (!user) {
                window.location.href = 'login.html';
            } else {
                // Initialize usage display when user is authenticated
                setTimeout(updateUsageDisplay, 500);
                
                // Initialize welcome message for new chats
                setTimeout(() => {
                    const messagesContainer = document.getElementById('chatMessages');
                    if (messagesContainer.children.length === 0) {
                        addMessageToChat('স্বাগতম! আমি GPToraAI, আপনার উন্নত AI সহায়ক। আমি GPT-3.5 এবং DALL·E 2 ব্যবহার করে আপনাকে সাহায্য করতে পারি। কী নিয়ে কথা বলতে চান?', 'ai');
                    }
                }, 1000);
            }
        });
    }
    
    // Add overlay creation
    if (!document.querySelector('.panel-overlay')) {
        createOverlay();
    }
    
    // Close panels on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSidePanel();
            closeChatHistory();
        }
    });
});
