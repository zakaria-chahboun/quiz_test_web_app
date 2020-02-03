//const admin = require("firebase-admin");

import firebase from "firebase-admin";
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

// You have to put your 'firebase json configurations' and 'firebase url' in '.env' file, check readme

let serviceAccount = JSON.parse(fs.readFileSync(`${process.env.FIREBASE_JSON_COFIGURATION}`).toString());

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: `${process.env.FIREBASE_URL}`
});

export const admin = firebase;