"use client";
import styles from "../app/styles/Chatbot.module.css";
import { useState } from "react";
import ReactDOM from "react-dom";
import MarkdownRenderer from "./MarkdownRenderer";

export default function QueryControls() {
    const [messageCounter, setMessageCounter] = useState(0);
    // Display a message on the frontend
    function appendMessage(sender, message) {
        const messagesDiv = document.getElementById("messages");
        const messageElement = document.createElement("div");
        messageElement.classList.add("message");
    
        const senderElement = document.createElement("div");
        senderElement.classList.add("sender");
        senderElement.textContent = sender.toUpperCase();
    
        const contentElement = document.createElement("div");
        contentElement.classList.add("content");
    
        messageElement.appendChild(senderElement);
        messageElement.appendChild(contentElement);
        messagesDiv.appendChild(messageElement);
    
        setMessageCounter((prevCounter) => {
            const currentCounter = prevCounter;

            contentElement.innerHTML = `<div id="markdown-content${currentCounter}"></div>`;
            const markdownElement = document.getElementById(`markdown-content${currentCounter}`);
            
            ReactDOM.render(
                <MarkdownRenderer content={message} />, markdownElement
            );

            return currentCounter + 1;
        });
    
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Fetch a response from the ChatGPT API
    async function fetchChatGPTResponse(userInput) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: userInput }),
        });
    
        const botMessage = await response.json();
        if (botMessage.error) {
        appendMessage("Error", botMessage.error);
        } else {
        appendMessage("Assistant", botMessage.text);
        }
    }
  
    // Send a message to the ChatGPT API
    async function sendMessage() {
        const userInput = document.getElementById("user-input").value;
        if(userInput.trim() === "") return;

        appendMessage("You", userInput);
        document.getElementById("user-input").value = "";
      
        const sendButton = document.getElementById("send-button");
        const queryButton = document.getElementById("query-button");
        queryButton.disabled = true;
        sendButton.disabled = true;
    
        await fetchChatGPTResponse(userInput);
      
        sendButton.disabled = false;
        queryButton.disabled = false;
    }

    // Send most relevant files to ChatGPT API
    async function sendFiles(files, userInput) {
        let request = "";
    
        for (let i = 0; i < files.length; i++) {
        request = request.concat(files[i] + "\n");
        }
    
        request = request.concat('I have a question about this code (if what follows does not seem like a reasonable question, prompt me to enter my question again): ' + userInput);
    
        await fetchChatGPTResponse(request);
    }

    // Create a query from the user input that will be used to find the most relevant files
    async function sendCodebaseQuery() {
        const userInput = document.getElementById("user-input").value;
        if (userInput.trim() === "") return;
    
        appendMessage("You", userInput);
        document.getElementById("user-input").value = "";
    
        const sendButton = document.getElementById("send-button");
        const queryButton = document.getElementById("query-button");
        queryButton.disabled = true;
        sendButton.disabled = true;

        // UNCOMMENT the following line when the Pinecone functionality has been implemented
        await fetchPineconeResponse(userInput);
    
        sendButton.disabled = false;
        queryButton.disabled = false;
    }

    // Fetch a response from the Pinecone API, generate an embedding from the user input
    async function fetchPineconeResponse(userInput) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/database`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: userInput }),
        });
    
        const botMessage = await response.json();
        if (botMessage.error) {
        appendMessage("Error", botMessage.error);
        } else {
        appendMessage("Assistant", botMessage.text);
        sendFiles(botMessage.files, userInput);
        }
    }

    return (
        <div className={styles.submitFlex}>
            <button
            id="send-button"
            className={styles.submitButton}
            onClick={sendMessage}
            >
            Enter
            </button>
            <button
            id="query-button"
            className={styles.submitButton}
            onClick={sendCodebaseQuery}
            >
            Query codebase
            </button>
        </div>
    );
}