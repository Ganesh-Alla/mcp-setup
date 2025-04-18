import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
  name: "NextJS Demo",
  version: "1.0.0"
});

// Add an addition tool
server.tool("add",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }]
  })
);

// Add a weather tool
server.tool("getWeather",
  { city: z.string() },
  async ({ city }) => ({
    content: [{ 
      type: "text", 
      text: `The weather in ${city} is currently sunny with a temperature of 72°F.`
    }]
  })
);

// Add a dynamic greeting resource
server.resource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  async (uri, { name }) => ({
    contents: [{
      uri: uri.href,
      text: `Hello, ${name}!`
    }]
  })
);

// Add a documentation resource
server.resource(
  "docs",
  "docs://api",
  async (uri) => ({
    contents: [{
      uri: uri.href,
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
  })
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);

console.log("MCP Server started with stdio transport");