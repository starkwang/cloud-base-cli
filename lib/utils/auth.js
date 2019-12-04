"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const http_1 = __importDefault(require("http"));
const crypto_1 = __importDefault(require("crypto"));
const portfinder_1 = __importDefault(require("portfinder"));
const query_string_1 = __importDefault(require("query-string"));
const open_1 = __importDefault(require("open"));
const address_1 = __importDefault(require("address"));
var cli_table_1 = require("./cli-table");
exports.printHorizontalTable = cli_table_1.printHorizontalTable;
const store_1 = require("./store");
const constant_1 = require("../constant");
const logger_1 = __importDefault(require("../logger"));
const utils_1 = require("../utils");
const error_1 = require("../error");
const logger = new logger_1.default('Auth');
const defaultPort = 9012;
const CliAuthBaseUrl = 'https://console.cloud.tencent.com/tcb/auth';
const refreshTokenUrl = 'https://iaas.cloud.tencent.com/tcb_refresh';
function getPort() {
    return __awaiter(this, void 0, void 0, function* () {
        const port = yield portfinder_1.default.getPortPromise({
            port: defaultPort
        });
        return port;
    });
}
function getMacAddress() {
    return new Promise(resolve => {
        address_1.default.mac((err, mac) => {
            if (err) {
                resolve('');
                return;
            }
            resolve(mac);
        });
    });
}
function getOSInfo() {
    const hostname = os_1.default.hostname();
    const platform = os_1.default.platform();
    const release = os_1.default.release();
    const platformRelease = utils_1.getPlatformRelease(platform, release);
    return [hostname, platformRelease].join('/');
}
function md5(str) {
    const hash = crypto_1.default.createHash('md5');
    hash.update(str);
    return hash.digest('hex');
}
function refreshTmpToken(metaData) {
    return __awaiter(this, void 0, void 0, function* () {
        const mac = yield getMacAddress();
        const hash = md5(mac);
        metaData.hash = hash;
        const res = yield utils_1.fetch(refreshTokenUrl, {
            method: 'POST',
            body: JSON.stringify(metaData),
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.code !== 0) {
            throw new error_1.CloudBaseError(res.message, {
                code: res.code
            });
        }
        const { data: credential } = res;
        return credential;
    });
}
exports.refreshTmpToken = refreshTmpToken;
function getCredentialData() {
    return store_1.authStore.get(constant_1.ConfigItems.credentail);
}
exports.getCredentialData = getCredentialData;
function getCredentialWithoutCheck() {
    return __awaiter(this, void 0, void 0, function* () {
        const credential = getCredentialData();
        if (!credential) {
            return null;
        }
        if (credential.secretId && credential.secretKey) {
            const { secretId, secretKey } = credential;
            return {
                secretId,
                secretKey
            };
        }
        if (credential.refreshToken) {
            if (Date.now() < Number(credential.tmpExpired)) {
                const { tmpSecretId, tmpSecretKey, tmpToken } = credential;
                return {
                    secretId: tmpSecretId,
                    secretKey: tmpSecretKey,
                    token: tmpToken
                };
            }
            else if (Date.now() < Number(credential.expired)) {
                const refreshCredential = yield refreshTmpToken(credential);
                store_1.authStore.set(constant_1.ConfigItems.credentail, refreshCredential);
                const { tmpSecretId, tmpSecretKey, tmpToken } = refreshCredential;
                return {
                    secretId: tmpSecretId,
                    secretKey: tmpSecretKey,
                    token: tmpToken
                };
            }
        }
        return null;
    });
}
exports.getCredentialWithoutCheck = getCredentialWithoutCheck;
function createLocalServer() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const server = http_1.default.createServer();
            try {
                const port = yield getPort();
                server.listen(port, () => {
                    resolve({
                        port,
                        server
                    });
                });
            }
            catch (err) {
                reject(err);
            }
        }));
    });
}
function getAuthTokenFromWeb(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { getAuthUrl } = options;
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const loading = utils_1.loadingFactory();
            loading.start('正在打开腾讯云获取授权');
            try {
                const { server, port } = yield createLocalServer();
                const mac = yield getMacAddress();
                const os = getOSInfo();
                const hash = md5(mac);
                if (!mac) {
                    throw new error_1.CloudBaseError('获取 Mac 地址失败，无法登录！');
                }
                let cliAuthUrl = `${CliAuthBaseUrl}?port=${port}&hash=${hash}&mac=${mac}&os=${os}`;
                if (getAuthUrl) {
                    try {
                        cliAuthUrl = getAuthUrl(`${CliAuthBaseUrl}?port=${port}&hash=${hash}&mac=${mac}&os=${os}`);
                    }
                    catch (error) {
                    }
                }
                yield open_1.default(cliAuthUrl);
                loading.succeed('已打开云开发 CLI 授权页面，请在云开发 CLI 授权页面同意授权！');
                server.on('request', (req, res) => {
                    const { url } = req;
                    const { query } = query_string_1.default.parseUrl(url);
                    res.writeHead(200, {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'text/plain',
                        Connection: 'close'
                    });
                    res.end('ok');
                    if (query && query.tmpToken) {
                        server.close();
                    }
                    resolve(query);
                });
            }
            catch (err) {
                logger.error(err.message);
                loading.fail('获取授权失败！');
                reject(err);
            }
        }));
    });
}
exports.getAuthTokenFromWeb = getAuthTokenFromWeb;