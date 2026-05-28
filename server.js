const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { exec } = require("node:child_process");

const root = __dirname;
const host = "0.0.0.0";
const startPort = 5173;
const shouldOpenBrowser = !process.argv.includes("--no-open");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const requestPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const filePath = path.resolve(root, `.${requestPath}`);
    const relativePath = path.relative(root, filePath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      send(res, 403, "Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        send(res, 404, "Not found");
        return;
      }

      send(res, 200, data, types[path.extname(filePath)] || "application/octet-stream");
    });
  });
}

function getLanUrls(port) {
  const urls = [];

  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const item of interfaces || []) {
      if (item.family === "IPv4" && !item.internal) {
        urls.push(`http://${item.address}:${port}`);
      }
    }
  }

  return [...new Set(urls)];
}

function listen(port) {
  const server = createServer();

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && port < startPort + 20) {
      listen(port + 1);
      return;
    }

    console.error(error.message);
    process.exit(1);
  });

  server.listen(port, host, () => {
    const localUrl = `http://127.0.0.1:${port}`;
    const lanUrls = getLanUrls(port);

    console.log("");
    console.log("Meteor Patrol is running.");
    console.log(`Computer: ${localUrl}`);
    if (lanUrls.length) {
      console.log("Phone on the same Wi-Fi:");
      for (const url of lanUrls) {
        console.log(`  ${url}`);
      }
    } else {
      console.log("No LAN address was found. Make sure Wi-Fi is enabled.");
    }
    console.log("Keep this window open while playing. Press Ctrl+C to stop.");
    if (shouldOpenBrowser && process.platform === "win32") {
      exec(`start "" "${localUrl}"`);
    }
  });
}

listen(startPort);
