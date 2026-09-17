"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const database_1 = require("./config/database");
const socketManager_1 = require("./sockets/socketManager");
const env_1 = require("./config/env");
const server = http_1.default.createServer(app_1.default);
(0, socketManager_1.initSocket)(server);
const start = async () => {
    await (0, database_1.connectDatabase)();
    server.listen(env_1.env.PORT, () => {
        console.log(`🚀 CampusPrint server running on port ${env_1.env.PORT}`);
        console.log(`🌍 Environment: ${env_1.env.NODE_ENV}`);
        console.log(`📱 Client URL: ${env_1.env.CLIENT_URL}`);
    });
};
start().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map