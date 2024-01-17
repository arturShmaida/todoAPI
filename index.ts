const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const cors = require("cors")
const fs = require("fs");
const USER_DB_NAME = "userBd";
const ITEM_DB_NAME = "itemBd";
import type { NextFunction, Request, Response } from "express";


const port = 3000;
const app = express();


let jsonParser = bodyParser.json();
app.use(cors(
    {
        origin: true,
        methods: "GET,HEAD,PUT,POST,DELETE",
        credentials: true,
        optionsSuccessStatus: 204,
    }
));
app.use(express.static("public"));
app.use(jsonParser)

function logger(request: any, response: Response, next: NextFunction) {
    let time = new Date(Date.now()).toTimeString();
    console.log(`${request.method}: ${request.sessionID} : loggedIn: ${request.session.loggedIn} | ${time}`)
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
}))
app.use(logger);
app
    .all("/api/v2/router", (request: any, response: Response) => {
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
    })

app.post("/api/v1/login", handleLogin)
async function handleLogin(request: any, response: Response) {
    try {
        // request.session.regenerate(() => {
        //     console.log("regenrated session")
        // })
        const { login, pass } = request.body;
        const db = await accessFile(USER_DB_NAME);
        let storageId = await areValidCredentials(login, pass, db)
        if (storageId) {

            request.session.storageId = storageId;
            request.session.loggedIn = true;
            response.status(201).json({ ok: true });
        } else {
            response.status(400).json({ ok: false });
        }
    } catch (err: any) {
        return response.status(500).json({ error: err.message });
    }
}
type User = { login: string, pass: string, sessionID: undefined | string };


async function areValidCredentials(login: string, pass: string, db: { users: [{ login: string, pass: string, id: number | string }] }) {
    let storageId = undefined;
    if (login && pass) {
        for (const user of db.users) {
            if (user.login == login && user.pass == pass) {
                storageId = user.id;
            }
        }
    }
    return storageId;
}
app.post("/api/v1/register", handleRegister)
async function handleRegister(request: any, response: Response) {
    try {
        const { login, pass } = request.body;
        if (login && pass) {
            const userDb = await accessFile(USER_DB_NAME);
            let nextId = userDb.users.reduce((previousValue: string | number, currentValue: { id: string | number }) => {
                return currentValue.id > previousValue ? currentValue.id : previousValue;
            }, 0) + 1;
            const newUser = {
                login: login,
                pass: pass,
                id: nextId
            }
            createNewRecord(nextId);
            userDb.users.push(newUser);
            updateFile(userDb, USER_DB_NAME);
            request.session.regenerate(() => {
                console.log("regenerated session")
            })
            response.status(201).json({ ok: true });
        } else {
            response.status(400).json({ ok: false });
        }
    } catch (err: any) {
        return response.status(500).json({ error: err.message }).end();
    }
}
async function createNewRecord(newId: number | string) {
    const itemDb = await accessFile(ITEM_DB_NAME);
    itemDb[newId] = {
        items: []
    }
    updateFile(itemDb, ITEM_DB_NAME);
}
app.post("/api/v1/logout", handleLogout)

async function handleLogout(request: any, response: Response) {
    try {

        request.session.destroy((err: Error) => {
            if (err) {
                response.status(203).json({ ok: false })
            } else {
                response.status(203).json({ ok: true })
            }
        })

    }
    catch (err: any) {
        return response.status(500).json({ error: err.message }).end();
    }

}


async function handelGetItems(request: any, response: Response) {
    try {

        let items;
        console.log(request.session)
        if (request.session.loggedIn) {
            let fileObject = await accessFile(ITEM_DB_NAME);
            items = fileObject[request.session.storageId];
        } else {
            return response.status(403).json({ error: "forbidden" })
        }
        return response.status(200).json(items);

    } catch (err: any) {

        return response.status(500).json({ error: err.message });
    }
}
// повинен повернути в форматі json наступне:
// { items: [ { id: 22, text: "...", checked: true } , ... ] } 
app.get("/api/v1/items", handelGetItems)

/*POST /api/v1/items повинен приймати json { text: "..." } 
а повертати { id: 23 } або щось схоже.*/
app.post("/api/v1/items", handleAddItem)
async function handleAddItem(request: any, response: Response) {
    try {
        let dbObject;
        let itemText = request.body.text;
        let storageId;

        if (request.session.loggedIn) {
            dbObject = await accessFile(ITEM_DB_NAME);
            storageId = request.session.storageId;
        } else {
            return response.status(403).json({ error: "forbidden" })

        }

        if (typeof itemText === typeof "") {
            let id = await createTodoItem(dbObject, itemText, storageId);
            return response.status(201).json({ id })
        } else {
            return response.status(400).json({ error: "No text sent" })
        }
    } catch (err: any) {
        console.log(err)
        return response.status(500).json({ error: err.message }).end();
    }
}



function createTodoItem(itemDb: { record: { items: [{ id: number }] } }, inputText: string, recordId: string | undefined) {
    return new Promise((resolve, reject) => {
        type ObjectKey = keyof typeof itemDb;
        const recordKey = recordId as ObjectKey;

        let currentRecord;

        currentRecord = itemDb[recordKey];

        let nextId = currentRecord.items.reduce((previousValue: number, currentValue: { id: number }) => {
            return currentValue.id > previousValue ? currentValue.id : previousValue;
        }, 0) + 1;
        let item = {
            id: nextId,
            text: inputText,
            checked: false
        }
        currentRecord.items.push(item);
        if (recordId !== undefined) {
            updateFile(itemDb, ITEM_DB_NAME);
        }
        resolve(nextId);

    });
}
app.put("/api/v1/items", handleEditItem)
async function handleEditItem(request: any, response: Response) {
    try {
        let dbObject;
        let storageId;
        if (request.session.loggedIn) {
            dbObject = await accessFile(ITEM_DB_NAME);
            storageId = request.session.storageId;
        } else {
            return response.status(403).json({ error: "forbidden" })
        }

        let modifiedItem = request.body;
        const { text, id, checked } = modifiedItem;
        if (text && id && (checked !== undefined)) {
            let isOk = await modifyTodoItem(dbObject, modifiedItem, storageId);
            return response.status(200).json(isOk);
        } else {
            return response.status(400).json({ error: "Request body is not full" });
        }

    } catch (err: any) {
        return response.status(500).json({ error: err.message }).end();
    }
}

type Item = { id: number, text: string, checked: boolean };
function modifyTodoItem(itemDb: { record: { items: [Item] } }, inputItem: Item, recordId: string | undefined) {
    return new Promise(async (resolve, reject) => {
        type ObjectKey = keyof typeof itemDb;
        const recordKey = recordId as ObjectKey;
        let currentRecord = itemDb[recordKey];

        let targetItem = currentRecord.items.find((seekItem: Item) => {
            if (seekItem.id === inputItem.id) {
                return seekItem;
            }
        });


        if (targetItem !== undefined) {
            targetItem.text = inputItem.text;
            targetItem.checked = inputItem.checked;
            await updateFile(itemDb, ITEM_DB_NAME);
            resolve({ ok: true });
        } else {
            resolve({ ok: false });
        }
    });
}
/*DELETE /api/v1/items повинен приймати json { id: 22 } а повертати { "ok" : true }
 спочатку реалізуйте через зберігання в .json файлі потім зберігайте 
 в БД, спробуйте варіанти з кількома лібами.*/
app.delete("/api/v1/items", handleDeleteItem)

async function handleDeleteItem(request: any, response: Response) {
    try {
        let dbObject;
        if (request.session.loggedIn) {
            dbObject = await accessFile(ITEM_DB_NAME);
        } else {
            return response.status(403).json({ error: "forbidden" })
        }

        let storageId = request.session.storageId;

        let itemId = request.body;
        if (itemId) {
            let isOk = await deleteTodoItem(dbObject, itemId, storageId);
            return response.status(203).json(isOk);
        } else {
            return response.status(400).json({ error: "Non valid id" });
        }

    } catch (err: any) {
        return response.status(500).json({ error: err.message }).end();
    }
}

function deleteTodoItem(storage: { record: { items: [itemDb: Item] } }, inputItemId: { id: number }, recordId: string) {
    return new Promise((resolve, reject) => {
        let indexToDelete = -1;
        let counter = 0;

        type ObjectKey = keyof typeof storage;
        const recordKey = recordId as ObjectKey;
        let currentRecord = storage[recordKey];

        currentRecord.items.find((seekItem: Item) => {
            if (seekItem.id == inputItemId.id) {
                return indexToDelete = counter;
            }
            counter++;
        });

        if (indexToDelete !== -1) {
            currentRecord.items.splice(indexToDelete, 1)
            updateFile(storage, ITEM_DB_NAME);
            resolve({ ok: true });
        } else {
            resolve({ ok: false });
        }
    });
}

async function accessFile(name: string) {
    let data = fs.readFileSync(`nodemonIgnore\\${name}.json`);
    return JSON.parse(data)
}

async function updateFile(fileDataObject: Object, name: string) {

    let jsonString = JSON.stringify(fileDataObject, null, 2);
    fs.writeFileSync(`nodemonIgnore\\${name}.json`, jsonString, "utf-8", (err: Error) => {
        if (err) {
            throw err;
        }
        console.log("Data in the file updated!")
    })
}
app.listen(port, (err: any) => {
    if (err) {
        console.log("Error occured", err);
        return;
    }
    console.log(`Listening on port ${port}`)
})