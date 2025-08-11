# 1. Node.js MCP Server Prototype

This prototype demonstrates the integration of the **Model Context Protocol (MCP)** with a **Hapi.js** backend server. Its primary aim is to explore how MCP tools can be effectively utilised within a JavaScript project. This prototype implements an MCP server for managing notes, leveraging **MongoDB** for storage. The project is designed to assess the feasibility of using MCP with JavaScript in practical, real-world scenarios.

---

## 2. Setting Up Your Local Environment

### 2.1 Prerequisites

- **Node.js**: Install [Node.js](http://nodejs.org/) `>= v22` and [npm](https://nodejs.org/) `>= v9`. Using [nvm](https://github.com/nvm-sh/nvm) is recommended for managing Node.js versions.
- **MongoDB**: Ensure a MongoDB instance is running locally or accessible remotely. See the installation instructions below.
- **Docker**: Install [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/).

### 2.2 Installing MongoDB (macOS and Windows)

#### macOS
1. Open a terminal.
2. Install the MongoDB Community Edition using Homebrew:

   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   ```

3. Start the MongoDB service:

   ```bash
   brew services start mongodb-community
   ```

4. Verify that MongoDB is running:

   ```bash
   mongo --eval 'db.runCommand({ connectionStatus: 1 })'
   ```

#### Windows
1. Download the MongoDB Community Edition installer from the [official MongoDB website](https://www.mongodb.com/try/download/community).
2. Run the installer and follow the setup instructions.
3. During installation, ensure the "Install MongoDB as a Service" option is selected.
4. Once installed, MongoDB will start automatically as a Windows service.
5. Verify that MongoDB is running by opening a Command Prompt and running:

   ```cmd
   mongo --eval "db.runCommand({ connectionStatus: 1 })"
   ```

### 2.3 Environment Variables

Create a `.env` file in the root of the project directory with the following variables:

```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
MONGO_URI=mongodb://localhost:27017/mcp-prototype
```

---

## 3. Building and Running the Application

You can start the application using either **Docker** or **npm**:

### 3.1 Using Docker

1. Build and start the application:

   ```bash
   docker compose up --build
   ```

2. Access the application:
   - **API Server**: [http://localhost:3000](http://localhost:3000)
   - **MCP Endpoint**: [http://localhost:3000/mcp](http://localhost:3000/mcp)
   - **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

### 3.2 Using npm

1. Install dependencies:

   ```bash
   npm install
   ```

2. For production mode:

   ```bash
   npm start
   ```

---

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
