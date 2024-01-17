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
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const cors = require("cors");
const fs = require("fs");
const USER_DB_NAME = "userBd";
const ITEM_DB_NAME = "itemBd";
const port = 3000;
const app = express();
let jsonParser = bodyParser.json();
app.use(cors({
    origin: true,
    methods: "GET,HEAD,PUT,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204,
}));
app.use(express.static("public"));
app.use(jsonParser);
function logger(request, response, next) {
    let time = new Date(Date.now()).toTimeString();
    console.log(`${request.method}: ${request.sessionID} : loggedIn: ${request.session.loggedIn} | ${time}`);
    next();
}
app.use(session({
    store: new FileStore({}),
    secret: 'secret string',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 60000,
    }
}));
app.use(logger);
app
    .all("/api/v2/router", (request, response) => {
    let requestedAction = request.query.action;
    switch (requestedAction) {
        case "login": {
            handleLogin(request, response);
            break;
        }
        case "logout": {
            handleLogout(request, response);
            break;
        }
        case "register": {
            handleRegister(request, response);
            break;
        }
        case "getItems": {
            handelGetItems(request, response);
            break;
        }
        case "deleteItem": {
            handleDeleteItem(request, response);
            break;
        }
        case "addItem": {
            handleAddItem(request, response);
            break;
        }
        case "editItem": {
            handleEditItem(request, response);
            break;
        }
    }
});
app.post("/api/v1/login", handleLogin);
function handleLogin(request, response) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // request.session.regenerate(() => {
            //     console.log("regenrated session")
            // })
            const { login, pass } = request.body;
            const db = yield accessFile(USER_DB_NAME);
            let storageId = yield areValidCredentials(login, pass, db);
            if (storageId) {
                request.session.storageId = storageId;
                request.session.loggedIn = true;
                response.status(201).json({ ok: true });
            }
            else {
                response.status(400).json({ ok: false });
            }
        }
        catch (err) {
            return response.status(500).json({ error: err.message });
        }
    });
}
function areValidCredentials(login, pass, db) {
    return __awaiter(this, void 0, void 0, function* () {
        let storageId = undefined;
        if (login && pass) {
            for (const user of db.users) {
                if (user.login == login && user.pass == pass) {
                    storageId = user.id;
                }
            }
        }
        return storageId;
    });
}
app.post("/api/v1/register", handleRegister);
function handleRegister(request, response) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { login, pass } = request.body;
            if (login && pass) {
                const userDb = yield accessFile(USER_DB_NAME);
                let nextId = userDb.users.reduce((previousValue, currentValue) => {
                    return currentValue.id > previousValue ? currentValue.id : previousValue;
                }, 0) + 1;
                const newUser = {
                    login: login,
                    pass: pass,
                    id: nextId
                };
                createNewRecord(nextId);
                userDb.users.push(newUser);
                updateFile(userDb, USER_DB_NAME);
                request.session.regenerate(() => {
                    console.log("regenerated session");
                });
                response.status(201).json({ ok: true });
            }
            else {
                response.status(400).json({ ok: false });
            }
        }
        catch (err) {
            return response.status(500).json({ error: err.message }).end();
        }
    });
}
function createNewRecord(newId) {
    return __awaiter(this, void 0, void 0, function* () {
        const itemDb = yield accessFile(ITEM_DB_NAME);
        itemDb[newId] = {
            items: []
        };
        updateFile(itemDb, ITEM_DB_NAME);
    });
}
app.post("/api/v1/logout", handleLogout);
function handleLogout(request, response) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            request.session.destroy((err) => {
                if (err) {
                    response.status(203).json({ ok: false });
                }
                else {
                    response.status(203).json({ ok: true });
                }
            });
        }
        catch (err) {
            return response.status(500).json({ error: err.message }).end();
        }
    });
}
function handelGetItems(request, response) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let items;
            console.log(request.session);
            if (request.session.loggedIn) {
                let fileObject = yield accessFile(ITEM_DB_NAME);
                items = fileObject[request.session.storageId];
            }
            else {
                return response.status(403).json({ error: "forbidden" });
            }
            return response.status(200).json(items);
        }
        catch (err) {
            return response.status(500).json({ error: err.message });
        }
    });
}
// повинен повернути в форматі json наступне:
// { items: [ { id: 22, text: "...", checked: true } , ... ] } 
app.get("/api/v1/items", handelGetItems);
/*POST /api/v1/items повинен приймати json { text: "..." }
а повертати { id: 23 } або щось схоже.*/
app.post("/api/v1/items", handleAddItem);
function handleAddItem(request, response) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let dbObject;
            let itemText = request.body.text;
            let storageId;
            if (request.session.loggedIn) {
                dbObject = yield accessFile(ITEM_DB_NAME);
                storageId = request.session.storageId;
            }
            else {
                return response.status(403).json({ error: "forbidden" });
            }
            if (typeof itemText === typeof "") {
                let id = yield createTodoItem(dbObject, itemText, storageId);
                return response.status(201).json({ id });
            }
            else {
                return response.status(400).json({ error: "No text sent" });
            }
        }
        catch (err) {
            console.log(err);
            return response.status(500).json({ error: err.message }).end();
        }
    });
}
function createTodoItem(itemDb, inputText, recordId) {
    return new Promise((resolve, reject) => {
        const recordKey = recordId;
        let currentRecord;
        currentRecord = itemDb[recordKey];
        let nextId = currentRecord.items.reduce((previousValue, currentValue) => {
            return currentValue.id > previousValue ? currentValue.id : previousValue;
        }, 0) + 1;
        let item = {
            id: nextId,
            text: inputText,
            checked: false
        };
        currentRecord.items.push(item);
        if (recordId !== undefined) {
            updateFile(itemDb, ITEM_DB_NAME);
        }
        resolve(nextId);
    });
}
app.put("/api/v1/items", handleEditItem);
function handleEditItem(request, response) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let dbObject;
            let storageId;
            if (request.session.loggedIn) {
                dbObject = yield accessFile(ITEM_DB_NAME);
                storageId = request.session.storageId;
            }
            else {
                return response.status(403).json({ error: "forbidden" });
            }
            let modifiedItem = request.body;
            const { text, id, checked } = modifiedItem;
            if (text && id && (checked !== undefined)) {
                let isOk = yield modifyTodoItem(dbObject, modifiedItem, storageId);
                return response.status(200).json(isOk);
            }
            else {
                return response.status(400).json({ error: "Request body is not full" });
            }
        }
        catch (err) {
            return response.status(500).json({ error: err.message }).end();
        }
    });
}
function modifyTodoItem(itemDb, inputItem, recordId) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        const recordKey = recordId;
        let currentRecord = itemDb[recordKey];
        let targetItem = currentRecord.items.find((seekItem) => {
            if (seekItem.id === inputItem.id) {
                return seekItem;
            }
        });
        if (targetItem !== undefined) {
            targetItem.text = inputItem.text;
            targetItem.checked = inputItem.checked;
            yield updateFile(itemDb, ITEM_DB_NAME);
            resolve({ ok: true });
        }
        else {
            resolve({ ok: false });
        }
    }));
}
/*DELETE /api/v1/items повинен приймати json { id: 22 } а повертати { "ok" : true }
 спочатку реалізуйте через зберігання в .json файлі потім зберігайте
 в БД, спробуйте варіанти з кількома лібами.*/
app.delete("/api/v1/items", handleDeleteItem);
function handleDeleteItem(request, response) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let dbObject;
            if (request.session.loggedIn) {
                dbObject = yield accessFile(ITEM_DB_NAME);
            }
            else {
                return response.status(403).json({ error: "forbidden" });
            }
            let storageId = request.session.storageId;
            let itemId = request.body;
            if (itemId) {
                let isOk = yield deleteTodoItem(dbObject, itemId, storageId);
                return response.status(203).json(isOk);
            }
            else {
                return response.status(400).json({ error: "Non valid id" });
            }
        }
        catch (err) {
            return response.status(500).json({ error: err.message }).end();
        }
    });
}
function deleteTodoItem(storage, inputItemId, recordId) {
    return new Promise((resolve, reject) => {
        let indexToDelete = -1;
        let counter = 0;
        const recordKey = recordId;
        let currentRecord = storage[recordKey];
        currentRecord.items.find((seekItem) => {
            if (seekItem.id == inputItemId.id) {
                return indexToDelete = counter;
            }
            counter++;
        });
        if (indexToDelete !== -1) {
            currentRecord.items.splice(indexToDelete, 1);
            updateFile(storage, ITEM_DB_NAME);
            resolve({ ok: true });
        }
        else {
            resolve({ ok: false });
        }
    });
}
function accessFile(name) {
    return __awaiter(this, void 0, void 0, function* () {
        let data = fs.readFileSync(`nodemonIgnore\\${name}.json`);
        return JSON.parse(data);
    });
}
function updateFile(fileDataObject, name) {
    return __awaiter(this, void 0, void 0, function* () {
        let jsonString = JSON.stringify(fileDataObject, null, 2);
        fs.writeFileSync(`nodemonIgnore\\${name}.json`, jsonString, "utf-8", (err) => {
            if (err) {
                throw err;
            }
            console.log("Data in the file updated!");
        });
    });
}
app.listen(port, (err) => {
    if (err) {
        console.log("Error occured", err);
        return;
    }
    console.log(`Listening on port ${port}`);
});
