const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoDBStore = require("connect-mongo");
const cors = require("cors")
const DB_NAME = "todo_api";
const mongoDBuri = "mongodb+srv://arturshmaida:vkH3h7iO5SWO2xvd@cluster0.bnawpzq.mongodb.net/?retryWrites=true&w=majority";
import { type NextFunction, type Request, type Response } from "express";
const { router } = require("./router.js");
const { handleLogin, handleLogout, handleRegister, handelGetItems, handleDeleteItem, handleAddItem, handleEditItem } = require("./requestHandler.js");
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
const store = MongoDBStore.create({
    mongoUrl: mongoDBuri,
    dbName: DB_NAME,
    autoRemove: 'interval'
});
app.use(session({
    store: store,
    secret: 'secret string',
    resave: false,

    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 1,
    }
}))
app.use(logger);
app.use("/api/v2", router);
app.post("/api/v1/login", handleLogin);
app.post("/api/v1/register", handleRegister);
app.post("/api/v1/logout", handleLogout);

app
    .get("/api/v1/items", handelGetItems)
    .post("/api/v1/items", handleAddItem);

app
    .put("/api/v1/items", handleEditItem)
    .delete("/api/v1/items", handleDeleteItem);

app.listen(port, (err: any) => {
    if (err) {
        console.log("Error occured", err);
        return;
    }
    console.log(`Listening on port ${port}`)
})