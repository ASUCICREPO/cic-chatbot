import React, { useState, useEffect, useRef } from "react";
import { Grid, Avatar, Typography } from "@mui/material";
import BotAvatar from "../Assets/BotAvatar.png";
import { WEBSOCKET_API, ALLOW_MARKDOWN_BOT } from "../utilities/constants";
import ReactMarkdown from "react-markdown";
import { franc } from 'franc-min'; 

const StreamingMessage = ({ initialMessage, setProcessing, userLanguage }) => {
  const [responses, setResponses] = useState([]);
  const ws = useRef(null);
  const messageBuffer = useRef(""); // Buffer to hold incomplete JSON strings

  useEffect(() => {
    let language = userLanguage || (initialMessage ? franc(initialMessage) : "auto");

    if (language === "eng") language = "en";  // English
    if (language === "spa") language = "es";  // Spanish
    if (language === "cmn") language = "zh";  // Mandarin Chinese
    if (language === "rus") language = "ru";  // Russian
    if (language === "arb") language = "ar";  // Standard Arabic
    if (language === "ben") language = "bn";  // Bengali
    if (language === "hin") language = "hi";  // Hindi
    if (language === "por") language = "pt";  // Portuguese
    if (language === "ind") language = "id";  // Indonesian
    if (language === "jpn") language = "ja";  // Japanese
    if (language === "fra") language = "fr";  // French
    if (language === "deu") language = "de";  // German
    if (language === "jav") language = "jv";  // Javanese
    if (language === "kor") language = "ko";  // Korean
    if (language === "tel") language = "te";  // Telugu
    if (language === "vie") language = "vi";  // Vietnamese
    if (language === "mar") language = "mr";  // Marathi
    if (language === "ita") language = "it";  // Italian
    if (language === "tam") language = "ta";  // Tamil
    if (language === "tur") language = "tr";  // Turkish
    if (language === "urd") language = "ur";  // Urdu
    if (language === "guj") language = "gu";  // Gujarati
    if (language === "pol") language = "pl";  // Polish
    if (language === "ukr") language = "uk";  // Ukrainian
    if (language === "kan") language = "kn";  // Kannada
    if (language === "mai") language = "mai"; // Maithili
    if (language === "mal") language = "ml";  // Malayalam
    if (language === "pes") language = "fa";  // Iranian Persian
    if (language === "mya") language = "my";  // Burmese
    if (language === "swh") language = "sw";  // Swahili
    if (language === "sun") language = "su";  // Sundanese
    if (language === "ron") language = "ro";  // Romanian
    if (language === "pan") language = "pa";  // Punjabi
    if (language === "bho") language = "bho"; // Bhojpuri
    if (language === "amh") language = "am";  // Amharic
    if (language === "hau") language = "ha";  // Hausa
    if (language === "fuv") language = "ff";  // Nigerian Fulfulde
    if (language === "bos") language = "bs";  // Bosnian
    if (language === "hrv") language = "hr";  // Croatian
    if (language === "nld") language = "nl";  // Dutch
    if (language === "srp") language = "sr";  // Serbian
    if (language === "tha") language = "th";  // Thai
    if (language === "ckb") language = "ckb"; // Central Kurdish
    if (language === "yor") language = "yo";  // Yoruba
    if (language === "uzn") language = "uz";  // Northern Uzbek
    if (language === "zlm") language = "ms";  // Malay
    if (language === "ibo") language = "ig";  // Igbo
    if (language === "npi") language = "ne";  // Nepali
    if (language === "ceb") language = "ceb"; // Cebuano
    if (language === "skr") language = "skr"; // Saraiki
    if (language === "tgl") language = "tl";  // Tagalog
    if (language === "hun") language = "hu";  // Hungarian
    if (language === "azj") language = "az";  // Azerbaijani
    if (language === "sin") language = "si";  // Sinhala
    if (language === "koi") language = "koi"; // Komi-Permyak
    if (language === "ell") language = "el";  // Modern Greek
    if (language === "ces") language = "cs";  // Czech
    if (language === "mag") language = "mag"; // Magahi
    if (language === "run") language = "rn";  // Rundi
    if (language === "bel") language = "be";  // Belarusian
    if (language === "plt") language = "mg";  // Malagasy
    if (language === "qug") language = "qu";  // Chimborazo Highland Quichua
    if (language === "mad") language = "mad"; // Madurese
    if (language === "nya") language = "ny";  // Nyanja
    if (language === "zyb") language = "za";  // Zhuang
    if (language === "pbu") language = "ps";  // Northern Pashto
    if (language === "kin") language = "rw";  // Kinyarwanda
    if (language === "zul") language = "zu";  // Zulu
    if (language === "bul") language = "bg";  // Bulgarian
    if (language === "swe") language = "sv";  // Swedish
    if (language === "lin") language = "ln";  // Lingala
    if (language === "som") language = "so";  // Somali
    if (language === "hms") language = "hms"; // Qiandong Miao
    if (language === "hnj") language = "hnj"; // Hmong Njua
    if (language === "ilo") language = "ilo"; // Iloko
    if (language === "kaz") language = "kk";  // Kazakh
    if (language === "uig") language = "ug";  // Uighur
    if (language === "hat") language = "ht";  // Haitian
    if (language === "khm") language = "km";  // Khmer
    if (language === "prs") language = "ps";  // Dari
    if (language === "hil") language = "hil"; // Hiligaynon
    if (language === "sna") language = "sn";  // Shona
    if (language === "tat") language = "tt";  // Tatar
    if (language === "xho") language = "xh";  // Xhosa
    if (language === "hye") language = "hy";  // Armenian
    if (language === "min") language = "min"; // Minangkabau
    if (language === "afr") language = "af";  // Afrikaans
    if (language === "lua") language = "lu";  // Luba-Lulua
    if (language === "sat") language = "sat"; // Santali
    if (language === "bod") language = "bo";  // Tibetan
    if (language === "tir") language = "ti";  // Tigrinya
    if (language === "fin") language = "fi";  // Finnish
    if (language === "slk") language = "sk";  // Slovak
    if (language === "tuk") language = "tk";  // Turkmen
    if (language === "dan") language = "da";  // Danish
    if (language === "nob") language = "no";  // Norwegian Bokmål
    if (language === "suk") language = "suk"; // Sukuma
    if (language === "als") language = "sq";  // Albanian
    if (language === "sag") language = "sg";  // Sango
    if (language === "nno") language = "nn";  // Norwegian Nynorsk
    if (language === "heb") language = "he";  // Hebrew
    if (language === "mos") language = "mos"; // Mossi
    if (language === "tgk") language = "tg";  // Tajik
    if (language === "cat") language = "ca";  // Catalan
    if (language === "sot") language = "st";  // Southern Sotho
    if (language === "kat") language = "ka";  // Georgian
    if (language === "bcl") language = "bcl"; // Bikol
    if (language === "glg") language = "gl";  // Galician
    if (language === "lao") language = "lo";  // Lao
    if (language === "lit") language = "lt";  // Lithuanian
    if (language === "umb") language = "umb"; // Umbundu
    if (language === "tsn") language = "tn";  // Tswana
    if (language === "vec") language = "vec"; // Venetian
    if (language === "nso") language = "nso"; // Pedi
    if (language === "ban") language = "ban"; // Balinese
    if (language === "bug") language = "bug"; // Buginese
    if (language === "knc") language = "knc"; // Kanuri
    
    console.log("User-selected language:", userLanguage); // Log explicitly passed userLanguage
    console.log("Final language sent to WebSocket:", language);
    
    // Initialize WebSocket connection
    ws.current = new WebSocket(WEBSOCKET_API);
    console.log(WEBSOCKET_API);

    ws.current.onopen = () => {
      console.log("WebSocket Connected");
      // Send initial message
      ws.current.send(JSON.stringify({ action: "sendMessage", prompt: initialMessage, language: language}));
    };

    ws.current.onmessage = (event) => {
      try {
        messageBuffer.current += event.data; // Append new data to buffer
        const parsedData = JSON.parse(messageBuffer.current); // Try to parse the full buffer
        
        if (parsedData.type === "end") {
          // Implement your logic here
          setProcessing(false); // Set processing to false when parsing is complete
          console.log("end of conversation");
        }
        
        if (parsedData.type === "delta") {
          setResponses((prev) => [...prev, parsedData.text]);
        }

        // Update the previous data type
        messageBuffer.current = ""; // Clear buffer on successful parse
      } catch (e) {
        if (e instanceof SyntaxError) {
          console.log("Received incomplete JSON, waiting for more data...");
        } else {
          console.error("Error processing message: ", e);
          messageBuffer.current = ""; // Clear buffer if error is not related to JSON parsing
        }
      }
    };

    ws.current.onerror = (error) => {
      console.log("WebSocket Error: ", error);
    };

    ws.current.onclose = (event) => {
      if (event.wasClean) {
        console.log(`WebSocket closed cleanly, code=${event.code}, reason=${event.reason}`);
      } else {
        console.log("WebSocket Disconnected unexpectedly");
      }
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [initialMessage, setProcessing, userLanguage]
); // Add setProcessing to the dependency array

return (
  <Grid container direction="row" justifyContent="flex-start" alignItems="flex-end">
    <Grid item>
      <Avatar alt="Bot Avatar" src={BotAvatar} />
    </Grid>
    {ALLOW_MARKDOWN_BOT ? (
      <Grid item className="botMessage" sx={{ backgroundColor: (theme) => theme.palette.background.botMessage }}>
        <ReactMarkdown>{responses.join("")}</ReactMarkdown>
      </Grid>
    ) : (
      <Grid item className="botMessage" sx={{ backgroundColor: (theme) => theme.palette.background.botMessage }}>
        <Typography variant="body2">{responses.join("")}</Typography>  
      </Grid>
    )}
  </Grid>
  );
};

export default StreamingMessage;
