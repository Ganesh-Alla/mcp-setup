"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [requestBody, setRequestBody] = useState<string>(
    JSON.stringify({
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        client: {
          name: "Web Test Client",
          version: "1.0.0"
        }
      },
      id: 1
    }, null, 2)
  );
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const sendRequest = async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json"
      };
      
      if (sessionId) {
        headers["mcp-session-id"] = sessionId;
      }
      
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers,
        body: requestBody,
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
      
      // Check for session ID in response headers
      const newSessionId = res.headers.get("mcp-session-id");
      if (newSessionId && !sessionId) {
        setSessionId(newSessionId);
      }
    } catch (error) {
      console.error("Error sending request:", error);
      setResponse(JSON.stringify({ error: String(error) }, null, 2));
    } finally {
      setLoading(false);
    }
  };
  
  const handleInitialize = () => {
    setRequestBody(JSON.stringify({
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        client: {
          name: "Web Test Client",
          version: "1.0.0"
        }
      },
      id: 1
    }, null, 2));
    sendRequest();
  };
  
  const handleListTools = () => {
    setRequestBody(JSON.stringify({
      jsonrpc: "2.0",
      method: "listTools",
      params: {},
      id: 2
    }, null, 2));
    sendRequest();
  };
  
  const handleAdd = () => {
    setRequestBody(JSON.stringify({
      jsonrpc: "2.0",
      method: "invokeTool",
      params: {
        name: "add",
        params: {
          a: 5,
          b: 10
        }
      },
      id: 3
    }, null, 2));
    sendRequest();
  };
  
  const handleGetWeather = () => {
    setRequestBody(JSON.stringify({
      jsonrpc: "2.0",
      method: "invokeTool",
      params: {
        name: "getWeather",
        params: {
          city: "San Francisco"
        }
      },
      id: 4
    }, null, 2));
    sendRequest();
  };
  
  const handleListResources = () => {
    setRequestBody(JSON.stringify({
      jsonrpc: "2.0",
      method: "listResources",
      params: {},
      id: 5
    }, null, 2));
    sendRequest();
  };
  
  const handleGetGreeting = () => {
    setRequestBody(JSON.stringify({
      jsonrpc: "2.0",
      method: "fetchResource",
      params: {
        uri: "greeting://World"
      },
      id: 6
    }, null, 2));
    sendRequest();
  };
  
  const handleGetDocs = () => {
    setRequestBody(JSON.stringify({
      jsonrpc: "2.0",
      method: "fetchResource",
      params: {
        uri: "docs://api"
      },
      id: 7
    }, null, 2));
    sendRequest();
  };

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>MCP Test Interface</h1>
        {sessionId && <div className={styles.sessionId}>Session ID: {sessionId}</div>}
      </div>
      
      <div className={styles.actions}>
        <button onClick={handleInitialize}>Initialize</button>
        <button onClick={handleListTools} disabled={!sessionId}>List Tools</button>
        <button onClick={handleAdd} disabled={!sessionId}>Add Numbers</button>
        <button onClick={handleGetWeather} disabled={!sessionId}>Get Weather</button>
        <button onClick={handleListResources} disabled={!sessionId}>List Resources</button>
        <button onClick={handleGetGreeting} disabled={!sessionId}>Get Greeting</button>
        <button onClick={handleGetDocs} disabled={!sessionId}>Get Docs</button>
      </div>
      
      <div className={styles.container}>
        <div className={styles.column}>
          <h2>Request</h2>
          <textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            className={styles.textarea}
            aria-label="JSON-RPC request body"
          />
          <button 
            onClick={sendRequest} 
            className={styles.sendButton}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Request"}
          </button>
        </div>
        
        <div className={styles.column}>
          <h2>Response</h2>
          <pre className={styles.response}>{response}</pre>
        </div>
      </div>
    </main>
  );
}
