import { NextRequest, NextResponse } from 'next/server';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Map to store session IDs
const sessions: { [sessionId: string]: string } = {};

// Function to check if a request is an initialization request
function isInitializeRequest(body: Record<string, unknown>): boolean {
  return !!(
    body &&
    body.jsonrpc === "2.0" &&
    body.method === "initialize" &&
    body.params &&
    typeof body.params === "object" &&
    body.params !== null &&
    "client" in body.params
  );
}

// Create an MCP server instance
const mcpServer = new McpServer({
  name: "NextJS Demo",
  version: "1.0.0"
});

// Add an addition tool
mcpServer.tool("add",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }]
  })
);

// Add a weather tool
mcpServer.tool("getWeather",
  { city: z.string() },
  async ({ city }) => ({
    content: [{ 
      type: "text", 
      text: `The weather in ${city} is currently sunny with a temperature of 72°F.`
    }]
  })
);

// POST handler for client-to-server communication
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('Received MCP request');
  
  try {
    const body = await request.json() as Record<string, unknown>;
    const sessionId = request.headers.get('mcp-session-id');
    
    // Check if the client accepts the required content types
    const acceptHeader = request.headers.get('accept') || '';
    const acceptsJson = acceptHeader.includes('application/json');
    
    if (!acceptsJson) {
      return NextResponse.json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Not Acceptable: Client must accept application/json',
        },
        id: null,
      }, { status: 406 });
    }

    // Handle initialization request
    if (!sessionId && isInitializeRequest(body)) {
      const newSessionId = crypto.randomUUID();
      sessions[newSessionId] = newSessionId;
      
      // Process the initialize request directly
      if (body.method === 'initialize') {
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            server: {
              name: "NextJS Demo",
              version: "1.0.0"
            }
          },
          id: body.id
        }, {
          headers: {
            'mcp-session-id': newSessionId
          }
        });
      }
    }
    
    // Handle request with existing session
    if (sessionId && sessions[sessionId]) {
      // Process different request types
      if (body.method === 'listTools') {
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            tools: [
              {
                name: "add",
                description: "Adds two numbers together",
                parameters: {
                  a: { type: "number" },
                  b: { type: "number" }
                }
              },
              {
                name: "getWeather",
                description: "Gets the weather for a city",
                parameters: {
                  city: { type: "string" }
                }
              }
            ]
          },
          id: body.id
        }, {
          headers: {
            'mcp-session-id': sessionId
          }
        });
      } else if (body.method === 'invokeTool') {
        const params = body.params as Record<string, unknown>;
        const toolName = params.name as string;
        const toolParams = params.params as Record<string, unknown>;
        
        if (toolName === 'add') {
          const a = Number(toolParams.a);
          const b = Number(toolParams.b);
          return NextResponse.json({
            jsonrpc: "2.0",
            result: {
              content: [{ type: "text", text: String(a + b) }]
            },
            id: body.id
          }, {
            headers: {
              'mcp-session-id': sessionId
            }
          });
        } else if (toolName === 'getWeather') {
          const city = String(toolParams.city);
          return NextResponse.json({
            jsonrpc: "2.0",
            result: {
              content: [{ 
                type: "text", 
                text: `The weather in ${city} is currently sunny with a temperature of 72°F.`
              }]
            },
            id: body.id
          }, {
            headers: {
              'mcp-session-id': sessionId
            }
          });
        }
      } else if (body.method === 'listResources') {
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            resources: [
              {
                name: "greeting",
                description: "Get a personalized greeting",
                uriTemplate: "greeting://{name}"
              },
              {
                name: "docs",
                description: "API documentation",
                uriTemplate: "docs://api"
              }
            ]
          },
          id: body.id
        }, {
          headers: {
            'mcp-session-id': sessionId
          }
        });
      } else if (body.method === 'fetchResource') {
        const params = body.params as Record<string, unknown>;
        const uri = params.uri as string;
        
        if (uri.startsWith('greeting://')) {
          const name = uri.replace('greeting://', '');
          return NextResponse.json({
            jsonrpc: "2.0",
            result: {
              contents: [{
                uri: uri,
                text: `Hello, ${name}!`
              }]
            },
            id: body.id
          }, {
            headers: {
              'mcp-session-id': sessionId
            }
          });
        } else if (uri === 'docs://api') {
          return NextResponse.json({
            jsonrpc: "2.0",
            result: {
              contents: [{
                uri: uri,
                text: `
# API Documentation

This MCP server provides the following capabilities:

## Tools
- add: Adds two numbers together
- getWeather: Gets the current weather for a city

## Resources
- greeting://{name}: Get a personalized greeting
- docs://api: This documentation
                `
              }]
            },
            id: body.id
          }, {
            headers: {
              'mcp-session-id': sessionId
            }
          });
        }
      }
      
      // Unknown method
      return NextResponse.json({
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: 'Method not found',
        },
        id: body.id
      }, {
        headers: {
          'mcp-session-id': sessionId
        }
      });
    }
    
    // Invalid request
    return NextResponse.json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    }, { status: 400 });
    
  } catch (error: unknown) {
    console.error('Error handling MCP request:', error);
    
    return NextResponse.json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
      },
      id: null,
    }, { status: 500 });
  }
}

// GET handler for server-to-client notifications via SSE
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('Received GET MCP request');
  
  const sessionId = request.headers.get('mcp-session-id');
  if (!sessionId || !sessions[sessionId]) {
    return NextResponse.json({
      error: 'Invalid or missing session ID'
    }, { status: 400 });
  }
  
  // For SSE, we would normally set up a streaming response
  // But since we're using a simplified implementation, we'll just return a simple response
  return NextResponse.json({
    message: 'SSE not implemented in this simplified version'
  });
}

// DELETE handler for session termination
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  console.log('Received DELETE MCP request');
  
  const sessionId = request.headers.get('mcp-session-id');
  if (!sessionId || !sessions[sessionId]) {
    return NextResponse.json({
      error: 'Invalid or missing session ID'
    }, { status: 400 });
  }
  
  // Remove from sessions map
  delete sessions[sessionId];
  
  return NextResponse.json({
    success: true,
    message: 'Session terminated'
  });
}
