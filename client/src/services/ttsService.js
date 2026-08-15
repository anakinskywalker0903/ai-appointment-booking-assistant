/**
 * Text-to-Speech (TTS) service using browser-native Web Speech API.
 * 100% Free, zero external network requests.
 */

// Clean markdown and symbols for natural voice articulation
function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    // remove markdown bold/italic
    .replace(/[*_#`~]/g, '')
    // remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // remove emojis & special symbols
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{2388}\u{200D}]/gu, '')
    // clean multiple spaces and newlines
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

let preferredVoice = null;

// Find a natural, pleasant sounding voice
function getVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Prefer Google/Samantha/Natural English voices
  preferredVoice =
    voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Karen'))) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0];

  return preferredVoice;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    getVoice();
  };
}

export function speakText(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return;

  // Cancel any ongoing speech before starting new sentence
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(cleaned);
  const voice = preferredVoice || getVoice();
  if (voice) utterance.voice = voice;

  utterance.rate = 1.02; // natural pace
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
