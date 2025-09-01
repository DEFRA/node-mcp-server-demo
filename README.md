# 1. Node.js MCP Server Prototype

This prototype demonstrates the integration of the **Model Context Protocol (MCP)** with a **Hapi.js** backend server. Its primary aim is to explore how MCP tools can be effectively utilised within a JavaScript project. This prototype implements an MCP server for managing notes, leveraging **MongoDB** for storage. The project is designed to assess the feasibility of using MCP with JavaScript in practical, real-world scenarios.

---

## 2. Setting Up Your Local Environment


### 2.1 Prerequisites

- **Node.js**: Install [Node.js](http://nodejs.org/) `>= v22` and [npm](https://nodejs.org/) `>= v9`. Using [nvm](https://github.com/nvm-sh/nvm) is recommended for managing Node.js versions.
- **MongoDB**: Ensure a MongoDB instance is running locally or accessible remotely.

- **Docker**: Install [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/).


### 2.2 Environment Variables

Create a `.env` file in the root of the project directory with the following variables:

```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
MONGO_URI=mongodb://localhost:27017/mcp-prototype
```

---

## 3. Building and Running the Application

You can start the application using  **Docker**:

### 3.1 Using Docker

1. Build and start the application:

   ```bash
   docker compose up --build
   ```

2. Access the application:
   - **API Server**: [http://localhost:3000](http://localhost:3000)
   - **MCP Endpoint**: [http://localhost:3000/mcp](http://localhost:3000/mcp)
   - **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)
<<<<<<< HEAD

=======
---
>>>>>>> 433fa523ed9e5fc7d9ce83c14fe1a2fb5b05f819

## 4. Interacting with MCP Tools Using MCP Inspector

The **MCP Inspector** is a graphical tool that allows users to interact with the MCP server and test its tools. Follow these steps to install and run the MCP Inspector in a separate terminal session:

### 4.1 Installing MCP Inspector

1. Open a new terminal session.
2. Install the MCP Inspector globally using `npx`:

   ```bash
   npx @modelcontextprotocol/inspector
   ```

### 4.2 Running MCP Inspector

1. Start the MCP Inspector:

   ```bash
   npx @modelcontextprotocol/inspector
   ```

2. Open the Inspector URL in your browser (typically `http://localhost:6274/`).
3. Configure the connection:
   - **Transport Type**: HTTP
   - **URL**: `http://localhost:3000/mcp`

4. Use the Inspector interface to test the available MCP tools.
   - Click on the tools tab and list the available tools.

---



## 5. Notes

- This prototype is for demonstration purposes only and is not production-ready.
- For security, ensure `NODE_ENV=production` is set in production environments.
