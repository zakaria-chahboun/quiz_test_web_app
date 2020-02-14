import createError from 'http-errors';
import express from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import {
  merge
} from 'lodash';
import path from 'path';

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(cookieParser());
// app.set('view engine', 'pug');
// app.set('views', path.join(__dirname, 'views'));

// ---------- Editors/Admin Client Side Part ------------------
let editorsPath = "client/editors/public";
app.use('/editors', express.static(path.join(__dirname, editorsPath)));

app.get('/editors', (req, res) => {
  res.sendFile(`${editorsPath}/index.html`, {
    root: __dirname
  });
});


// GraphQl Server -----------------------------------------
import gqlHttp from "express-graphql";
import {
  makeExecutableSchema
} from 'graphql-tools';

import {
  typeDefs as quizDefs,
  resolvers as quizResolves
} from './resolvers/quiz.js'

import {
  typeDefs as userDefs,
  resolvers as userResolves
} from './resolvers/users.js'

import {
  typeDefs as editorDefs,
  resolvers as editorResolves
} from './resolvers/editors.js'

import {
  my_authentications
} from './authentification/authentication.js';

app.use("/api", gqlHttp((req, res) => ({
  pretty: true,
  graphiql: true,
  schema: makeExecutableSchema({
    typeDefs: [quizDefs, userDefs, editorDefs],
    resolvers: merge(quizResolves, userResolves, editorResolves)
  }),
  context: {
    data: async () => {
      // uid from firebase, isError: true if req.headers.authtoken exist but firebase auth is not :)
      let user = {
        uid: null,
        isError: false
      };

      if (req.headers.authtoken) {
        try {
          let uid = await my_authentications(req.headers.authtoken);

          user.uid = uid;
          user.isError = false;

          return user;

        } catch (error) {
          user.uid = null;
          user.isError = true;

          return user;
        }
      }

      return user; // return anyway :p defalut data

    }
  }
})))

// -----------------------------------------


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
//app.use(function (err, req, res, next) {
// set locals, only providing error in development
//res.locals.message = err.message;
//res.locals.error = req.app.get('env') === 'development' ? err : {};

// render the error page
//res.status(err.status || 500);
//res.render('error');
//});

export {
  app
};