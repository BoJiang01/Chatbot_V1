document.addEventListener('DOMContentLoaded', function() {
    // Add an introductory message from the bot when the page loads
    addMessage("Hello! I'm your AI assistant. How can I help you today?", 'bot');
});

document.getElementById('sendBtn').addEventListener('click', function() {
    sendMessage();
});

document.getElementById('userInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const userInput = document.getElementById('userInput');
    const chatHistory = document.getElementById('chatHistory');

    if (userInput.value.trim() !== '') {
        addMessage(userInput.value, 'user');

        // Simulate bot response
        setTimeout(() => {
            addMessage("I am a simple bot. I don't have real responses yet!", 'bot');
        }, 1000);

        // Clear the input
        userInput.value = '';
    }
}

function addMessage(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}-message`;

    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'avatar-container';

    const avatarElement = document.createElement('img');
    avatarElement.className = 'avatar';

    const roleLabel = document.createElement('div');
    roleLabel.className = 'role-label';
    roleLabel.textContent = sender === 'user' ? 'You' : 'Assistant';

    avatarContainer.appendChild(avatarElement);
    avatarContainer.appendChild(roleLabel);

    const messageBubbleElement = document.createElement('div');
    messageBubbleElement.className = 'message-bubble';
    messageBubbleElement.textContent = text;

    if (sender === 'user') {
        avatarElement.src = '/static/IMG_5129.jpg'; // Replace with your user's avatar image path
        messageElement.appendChild(messageBubbleElement);
        messageElement.appendChild(avatarContainer);
    } else {
        avatarElement.src = '/static/messi.jpeg'; // Replace with your bot's avatar image path
        messageElement.appendChild(avatarContainer);
        messageElement.appendChild(messageBubbleElement);
    }

    const chatHistory = document.getElementById('chatHistory');
    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

document.getElementById('restartBtn').addEventListener('click', function() {
    restartChat();
});

function restartChat() {
    const chatHistory = document.getElementById('chatHistory');
    chatHistory.innerHTML = ''; // Clear all chat messages

    // Optionally, you can add an initial bot message after restart
    addMessage("Chat has been restarted. How can I assist you?", 'bot');
}