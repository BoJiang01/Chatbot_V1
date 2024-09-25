// Initialize the chat with a greeting and set up event listeners
document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM fully loaded and parsed");
    addMessage("Hello! I'm your AI assistant. How can I help you today?", 'bot');

    // Check and set up preview button listener
    const previewToggleBtn = document.getElementById('previewToggleBtn');
    if (previewToggleBtn) {
        previewToggleBtn.onclick = toggleTablePreview;
    } else {
        console.warn("Preview Toggle Button not found in the DOM.");
    }

    // Initialize file upload listeners
    initializeFileUploadListeners();

    // Set up chat message event listeners
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('userInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') sendMessage();
    });
    document.getElementById('restartBtn').addEventListener('click', restartChat);
});

// Function to initialize file input and drag-and-drop listeners
function initializeFileUploadListeners() {
    console.log("Initializing file upload listeners...");

    // Handle file input change
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelection);
    } else {
        console.warn("File input element not found in the DOM.");
    }

    // Drag and drop functionality for file upload
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        ['dragover', 'dragleave', 'drop'].forEach(eventType => {
            uploadArea.addEventListener(eventType, handleDragAndDrop);
        });
    } else {
        console.warn("Upload area element not found in the DOM.");
    }
}

// Handle file selection from input
function handleFileSelection(event) {
    const file = event.target.files[0];
    if (file) {
        console.log("File selected:", file);
        handleFileUpload(file);
        event.target.value = ''; // Clear the file input value
    }
}

// Handle drag and drop events
function handleDragAndDrop(event) {
    event.preventDefault();
    const uploadArea = document.getElementById('uploadArea');

    if (event.type === 'dragover') {
        uploadArea.style.backgroundColor = "#e0e0e0";
    } else if (event.type === 'dragleave') {
        uploadArea.style.backgroundColor = "#f5f5f7";
    } else if (event.type === 'drop') {
        uploadArea.style.backgroundColor = "#f5f5f7";
        const file = event.dataTransfer.files[0];
        if (file) {
            console.log("File dropped:", file);
            handleFileUpload(file);
        }
    }
}

// Handle file upload and send to backend
async function handleFileUpload(file) {
    console.log("Uploading file:", file);
    if (file && file.name.endsWith('.csv')) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('https://chatbot-v1-0o4r.onrender.com/upload-csv/', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                addMessage("CSV file uploaded successfully.", 'bot');
                displayTablePreview(file);
            } else {
                console.error("Backend error during CSV upload:", response.status);
                addMessage("Error: Could not upload the CSV file.", 'bot');
            }
        } catch (error) {
            console.error('Error:', error);
            addMessage("Error: Could not connect to the backend for CSV upload.", 'bot');
        }
    } else {
        addMessage("Please upload a valid CSV file.", 'bot');
    }
}

// Send user message to the backend and handle response
async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();

    if (message !== '') {
        addMessage(message, 'user');
        userInput.value = '';

        try {
            const response = await fetch('https://chatbot-v1-0o4r.onrender.com/chat/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: message }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.chart) {
                    addMessage(data.bot_response, 'bot', data.chart);
                } else {
                    addMessage(data.bot_response, 'bot');
                }
            } else {
                console.error('Backend returned an error:', response.status);
                showErrorMessage("Error: Could not generate a response. Please try again.");
            }
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage("Error: Could not connect to the backend. Please try again.");
        }
    }
}

// Display a message in the chat
function addMessage(text, sender, chartSpec = null) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}-message`;

    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'avatar-container';
    const avatarElement = document.createElement('img');
    avatarElement.className = 'avatar';
    avatarElement.src = sender === 'user' ? '/static/IMG_5129.jpg' : '/static/messi.jpeg';

    const roleLabel = document.createElement('div');
    roleLabel.className = 'role-label';
    roleLabel.textContent = sender === 'user' ? 'You' : 'Assistant';

    avatarContainer.appendChild(avatarElement);
    avatarContainer.appendChild(roleLabel);

    const messageBubbleElement = document.createElement('div');
    messageBubbleElement.className = 'message-bubble';
    messageBubbleElement.textContent = text;

    if (sender === 'user') {
        messageElement.appendChild(messageBubbleElement);
        messageElement.appendChild(avatarContainer);
    } else {
        messageElement.appendChild(avatarContainer);
        messageElement.appendChild(messageBubbleElement);
    }

    const chatHistory = document.getElementById('chatHistory');
    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Render chart if specification is provided
    if (chartSpec) {
        const chartContainer = document.createElement('div');
        chartContainer.id = `chart-${Date.now()}`;
        messageBubbleElement.appendChild(chartContainer);

        vegaEmbed(`#${chartContainer.id}`, chartSpec)
            .catch(error => {
                console.error('Vega-lite error:', error);
                addMessage("Error: Unable to render the chart. Please try again.", 'bot');
            });
    }
}

// Display the table preview
function displayTablePreview(file) {
    const previewToggleBtn = document.getElementById('previewToggleBtn');
    const tablePreviewContainer = document.getElementById('tablePreview');

    const reader = new FileReader();
    reader.onload = function (event) {
        const csvData = event.target.result;
        const parsedData = d3.csvParse(csvData, d3.autoType);

        let tableHtml = '<table><thead><tr>';
        Object.keys(parsedData[0]).forEach(header => tableHtml += `<th>${header}</th>`);
        tableHtml += '</tr></thead><tbody>';

        parsedData.slice(0, 10).forEach(row => {
            tableHtml += '<tr>';
            Object.values(row).forEach(cell => tableHtml += `<td>${cell !== null ? cell : ''}</td>`);
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table>';

        tablePreviewContainer.innerHTML = tableHtml;
        previewToggleBtn.style.display = 'block';
        tablePreviewContainer.style.display = 'none';
    };
    reader.readAsText(file);
}

// Toggle table preview visibility
function toggleTablePreview() {
    const tablePreviewContainer = document.getElementById('tablePreview');
    const previewToggleBtn = document.getElementById('previewToggleBtn');

    if (tablePreviewContainer.style.display === 'none') {
        tablePreviewContainer.style.display = 'block';
        previewToggleBtn.textContent = "Hide Table Preview";
    } else {
        tablePreviewContainer.style.display = 'none';
        previewToggleBtn.textContent = "Show Table Preview";
    }
}

// Restart chat functionality
function restartChat() {
    const chatHistory = document.getElementById('chatHistory');
    chatHistory.innerHTML = '';
    addMessage("Chat has been restarted. How can I assist you?", 'bot');
}