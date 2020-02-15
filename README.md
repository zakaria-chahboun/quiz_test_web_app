# QuizTest WebApp


to run this app on *test mode* (localhost), you have to follow this instructions:

**get your copy version**
```git
git clone https://github.com/zakaria-chahboun/quiz_test_web_app.git
```

**install dependencies**
```sh
cd quiz_test_web_app
npm install
```

---------------------------------------------

#### Node & NPM version!

npm: 6.13.6

nodejs: v13.5.0

---------------------------------------------

### Cloud Firestore Configuration:

- **this is an important stape:**

create a **`.env`** file under **`quiz_test_web_app`** folder.

Add this envirement variable to this file:
```
FIREBASE_URL="YOUR_FIRESTORE_URL_HERE"
FIREBASE_JSON_COFIGURATION="PATH_TO_YOUR_FIREBASE_JSON_CONFUGURATION_FILE_HERE"
```

example:

```
FIREBASE_URL="https://myapp.firebaseio.com"
FIREBASE_JSON_COFIGURATION="./privte/myapp-firebase-adminsdk-96f60.json"
```
---------------------------------------------

### Cloud Firestore Collections:
add two root ***collections*** to your firestore database:

- **`/quizzes`**
- **`/users`**

<img src='https://i.imgur.com/PsYmxEq.png'>

---------------------------------------------

### Cloud Firestore Rules
add this rules to your app

```firebase
service cloud.firestore {
  match /databases/{database}/documents {
  // *** quizzes collection ****
  // ---------------------------
  // any visitor can read the quiz/tests with no authentification or with 'is_auth' field is false
  // only user can read the quiz/test with 'is_auth' field is true
  // only admin can write
    match /quizzes/{quiz_id} {
    
      /// _____ Functions _____
			function getQuizData() {
			return get(/databases/$(database)/documents/quizzes/$(quiz_id)).data
			}
      function isAdmin(){
      // 'isAdmin' is a 'custom claim'
      return request.auth.token["isAdmin"] == true;
      }
      // this is for check any editor/admin database existing
      function isEditor(){
      return exists(/databases/$(database)/documents/editors/$(request.auth.uid)) == true;
      }
      // to limit or spicified admin email to avoid "Property isAdmin is undefined"
			// after that we can check isAdmin() function
      function isEmailFormatAdmin(){
      return request.auth.token.email.lower().matches(".*admin[.]com")
      }
        
			// You can show quiz with 'is_auth = true' but you can't show his 'tests' baby HH...
			match /tests/{test_id}{
				allow read: if getQuizData().is_auth == false || request.auth != null;
      	// a simple editor can only: create (for now)
      	allow create: if request.auth != null && isEditor();
				// if Admin can: create, update, and delete
				allow write: if request.auth != null && isEditor() && isEmailFormatAdmin() && isAdmin();
    	}
      
    	allow read;
      // a simple editor can only: create (for now)
      allow create: if request.auth != null && isEditor();
      // if Admin can: create, update, and delete
			allow write: if request.auth != null && isEditor() && isEmailFormatAdmin() && isAdmin();
    }
    
  // **** users collection ***
  // -------------------------
  // only authentificated users can read and write
  // and Only user can read and write to his own space (database) 
  match /users/{user_id}{
  allow read, write: if request.auth.uid == resource.id;
  }
  }
}
```

<img src='https://i.imgur.com/aZJieZT.png'>



#### Finally!

**run code!**
```sh
npm run dev
```



zakaria chahboun 2019-2020*
