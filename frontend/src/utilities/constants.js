// --------------------------------------------------------------------------------------------------------//
// Primary color constants for the theme
export const PRIMARY_MAIN = "#8C1D40"; // The main primary color used for buttons, highlights, etc.
export const primary_50 = "#E7B00C"; // The 50 variant of the primary color

// Background color constants
export const SECONDARY_MAIN = "#FFC627"; // The main secondary color used for less prominent elements

// Chat component background colors
export const CHAT_BODY_BACKGROUND = "#FFFFFF"; // Background color for the chat body area
export const CHAT_LEFT_PANEL_BACKGROUND = "#000000"; // Background color for the left panel in the chat
export const ABOUT_US_HEADER_BACKGROUND = "#FFFFFF"; // Background color for the About Us section in the left panel
export const FAQ_HEADER_BACKGROUND = "#FFFFFF"; // Background color for the FAQ section in the left panel
export const ABOUT_US_TEXT = "#FFFFFF"; // Text color for the About Us section in the left panel
export const FAQ_TEXT = "#FFFFFF"; // Text color for the FAQ section in the left panel
export const HEADER_BACKGROUND = "#FFFFFF"; // Background color for the header
export const HEADER_TEXT_GRADIENT = "#8C1D40"; // Text gradient color for the header

// Message background colors
export const BOTMESSAGE_BACKGROUND = "#F5F5F5"; // Background color for messages sent by the bot
export const USERMESSAGE_BACKGROUND = "#FFEFCA"; // Background color for messages sent by the user

// --------------------------------------------------------------------------------------------------------//
// --------------------------------------------------------------------------------------------------------//

// Text Constants
export const TEXT = {
  EN: {
    APP_NAME: "Cloud Innovation Center GenAI Chat Assistant",
    APP_ASSISTANT_NAME: "CIC Assistant",
    ABOUT_US_TITLE: "About us",
    ABOUT_US: "Welcome to the ASU Cloud Innovation Center GenAI Chat Assistant! We're here to assist you in quickly accessing relevant information.",
    FAQ_TITLE: "Frequently Asked Questions",
    FAQS: [
      'What is the Cloud Innovation Center?',
      'What did the Cloud Innovation Center do for the Phoenix Zoo?',
      'How can I work with the Cloud Innovation Center?',
      'Who works at the Cloud Innovation Center?',
      'What projects does the Cloud Innovation Center work on?'
    ],
    CHAT_HEADER_TITLE: "CIC GenAI Chat Assistant",
    CHAT_INPUT_PLACEHOLDER: "What would you like to know?",
    HELPER_TEXT: "You cannot send an empty message!",
    SPEECH_RECOGNITION_START: "Start Listening",
    SPEECH_RECOGNITION_STOP: "Stop Listening",
    SPEECH_RECOGNITION_HELPER_TEXT: "Stop speaking to send the message"
  },
  ES: {
    APP_NAME: "Aplicación de Plantilla de Chatbot",
    APP_ASSISTANT_NAME: "Bot GenAI",
    ABOUT_US_TITLE: "Acerca de nosotros",
    ABOUT_US: "¡Bienvenido al chatbot GenAI! Estamos aquí para ayudarte a acceder rápidamente a la información relevante.",
    FAQ_TITLE: "Preguntas frecuentes",
    FAQS: [
      "¿Qué es React JS? y ¿Cómo puedo empezar?",
      "¿Qué es un Chatbot y cómo funciona?",
      "Escríbeme un ensayo sobre la historia de Internet.",
      "¿Cuál es la capital de Francia y su población?",
      "¿Cómo está el clima en Nueva York?"
    ],
    CHAT_HEADER_TITLE: "Asistente de Chat AI de Ejemplo",
    CHAT_INPUT_PLACEHOLDER: "Escribe una Consulta...",
    HELPER_TEXT: "No se puede enviar un mensaje vacío",
    SPEECH_RECOGNITION_START: "Comenzar a Escuchar",
    SPEECH_RECOGNITION_STOP: "Dejar de Escuchar",
    SPEECH_RECOGNITION_HELPER_TEXT: "Deja de hablar para enviar el mensaje" // New helper text
  }
};

export const SWITCH_TEXT = {
  SWITCH_LANGUAGE_ENGLISH: "English",
  SWITCH_TOOLTIP_ENGLISH: "Language",
  SWITCH_LANGUAGE_SPANISH: "Español",
  SWITCH_TOOLTIP_SPANISH: "Idioma"
};

export const LANDING_PAGE_TEXT = {
  EN: {
    CHOOSE_LANGUAGE: "Choose language:",
    ENGLISH: "English",
    SPANISH: "Español",
    SAVE_CONTINUE: "Save and Continue",
    APP_ASSISTANT_NAME: "CIC GenAI Bot Landing Page",
  },
  ES: {
    CHOOSE_LANGUAGE: "Elige el idioma:",
    ENGLISH: "English",
    SPANISH: "Español",
    SAVE_CONTINUE: "Guardar y continuar",
    APP_ASSISTANT_NAME: "Bot GenAI de Ejemplo Página de Inicio",
  }
};


// --------------------------------------------------------------------------------------------------------//
// --------------------------------------------------------------------------------------------------------//

// API endpoints


export const CHAT_API = process.env.REACT_APP_CHAT_API; // URL for the chat API endpoint
export const WEBSOCKET_API = process.env.REACT_APP_WEBSOCKET_API; // URL for the WebSocket API endpoint


// --------------------------------------------------------------------------------------------------------//
// --------------------------------------------------------------------------------------------------------//

// Features
export const ALLOW_FILE_UPLOAD = false; // Set to true to enable file upload feature
export const ALLOW_VOICE_RECOGNITION = true; // Set to true to enable voice recognition feature

export const ALLOW_MULTLINGUAL_TOGGLE = true; // Set to true to enable multilingual support
export const ALLOW_LANDING_PAGE = true; // Set to true to enable the landing page

// --------------------------------------------------------------------------------------------------------//
// Styling under work, would reccomend keeping it false for now
export const ALLOW_MARKDOWN_BOT = false; // Set to true to enable markdown support for bot messages
export const ALLOW_FAQ = true; // Set to true to enable the FAQs to be visible in Chat body 
