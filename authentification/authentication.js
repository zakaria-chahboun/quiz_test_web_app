import {
  admin
} from '../privte/firebase_conf.js'

//const db = admin.firestore();

// -----------------------------------------------------------------

// For just see the User/Admin/Edior/Anyone hh is signin 
// return: UID
export let my_authentications = (idToken) => new Promise((resolve, reject) => {

  // idToken comes from the client app
  admin.auth().verifyIdToken(idToken).then((decodedToken) => {
    let uid = decodedToken.uid;
    resolve(uid);
  }).catch((err) => {
    reject(error);
  });
});

// To check or separate the Roles .. if a regular user or editor have right tp fo somthing etc ..
// return: ROLES object
export let my_authorizations = (uid) => new Promise((resolve, reject) => {

  let roles = {
    isAdmin: false,
    isEditor: false,
    isUser: true
  };

  admin.auth().getUser(uid).then(user => {
    // is: Editor
    if (user.customClaims && user.customClaims.isEditor === true) {
      roles.isEditor == true;
      resolve(roles);
    }
    // is: Admin
    else if (user.customClaims && user.customClaims.isAdmin === true) {
      roles.isAdmin == true;
      resolve(roles);
    }
    // is: regular User
    else {
      resolve(roles); // defalut
    }
  }).catch(err => {
    reject(err);
  });
});


// This function is handling error messages from (context.data() in express-graphql),
// and use it in resolvers0
// this function wokrs with "my_authentications" function.
// To easily show messages and check if there is a problem :)
export let AssertAuthenticationsErrors = ({
  uid,
  isError
}) => {
  if (uid === null && isError === false)
    throw Error("You have to sign in or login!");

  else if (uid === null && isError === true)
    throw Error("Unauthorized!");
}